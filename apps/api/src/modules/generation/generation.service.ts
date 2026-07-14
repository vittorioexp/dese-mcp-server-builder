import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GENERATION_QUEUE, generationOptionsSchema } from '@dese-mcp/shared';
import type { GenerationOptions } from '@dese-mcp/shared';

@Injectable()
export class GenerationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(GENERATION_QUEUE) private readonly generationQueue: Queue,
  ) {}

  async trigger(
    projectId: string,
    organizationId: string,
    userId: string,
    options?: GenerationOptions,
  ) {
    const project = await this.prisma.mcpProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status === 'generating') {
      throw new BadRequestException('Generation already in progress');
    }

    const parsedOptions = options ? generationOptionsSchema.parse(options) : undefined;

    const versionCount = await this.prisma.mcpProjectVersion.count({
      where: { projectId },
    });

    const version = await this.prisma.mcpProjectVersion.create({
      data: {
        projectId,
        version: `1.0.${versionCount}`,
        changelog: 'Auto-generated version',
      },
    });

    const jobRecord = await this.prisma.job.create({
      data: {
        projectId,
        type: 'generation',
        status: 'pending',
        payload: {
          projectId,
          versionId: version.id,
          inputSource: project.inputSource,
          inputConfig: project.inputConfig,
          options: parsedOptions,
        },
      },
    });

    await this.generationQueue.add(
      'generate',
      {
        projectId,
        versionId: version.id,
        inputSource: project.inputSource,
        inputConfig: project.inputConfig as Record<string, unknown>,
        options: parsedOptions,
      },
      {
        jobId: jobRecord.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'generation.trigger',
        resource: 'mcp_project',
        resourceId: projectId,
        metadata: { versionId: version.id },
      },
    });

    return {
      jobId: jobRecord.id,
      versionId: version.id,
      status: 'pending',
    };
  }

  async getJobStatus(projectId: string, jobId: string): Promise<{
    id: string;
    type: string;
    status: string;
    result: unknown;
    error: string | null;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
  }> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, projectId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.result,
      error: job.error,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      createdAt: job.createdAt.toISOString(),
    };
  }
}
