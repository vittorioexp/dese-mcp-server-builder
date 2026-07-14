import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { GENERATION_QUEUE } from '@dese-mcp/shared';
import type { GenerationJobPayload, GenerationOptions } from '@dese-mcp/shared';
import { generatorRegistry } from '@dese-mcp/generator-core';
import { openApiGenerator } from '@dese-mcp/generator-openapi';
import type { InputSourceType } from '@dese-mcp/shared';

generatorRegistry.register(openApiGenerator);

@Processor(GENERATION_QUEUE)
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<GenerationJobPayload>): Promise<void> {
    const { projectId, versionId, inputSource, inputConfig, options } = job.data;
    this.logger.log(`Processing generation job ${job.id} for project ${projectId}`);

    await this.prisma.mcpProject.update({
      where: { id: projectId },
      data: { status: 'generating' },
    });

    await this.prisma.job.updateMany({
      where: { projectId, type: 'generation' },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      const generator = generatorRegistry.get(inputSource as InputSourceType);
      if (!generator) {
        throw new Error(`No generator registered for input source: ${inputSource}`);
      }

      const project = await this.prisma.mcpProject.findUniqueOrThrow({
        where: { id: projectId },
      });

      const defaultOptions: GenerationOptions = {
        includeTests: true,
        includeDocker: true,
        includeDocs: true,
        enableStreaming: false,
        ...options,
      };

      const context = {
        projectId,
        projectName: project.name,
        inputConfig,
        options: defaultOptions,
      };

      const analysis = await generator.analyze(context);
      const result = await generator.generate(context, analysis);

      const artifactKey = `projects/${projectId}/versions/${versionId}/manifest.json`;
      await this.storage.upload(
        artifactKey,
        JSON.stringify({ server: result.server, warnings: result.warnings }, null, 2),
        'application/json',
      );

      for (const file of result.files) {
        const fileKey = `projects/${projectId}/versions/${versionId}/files/${file.path}`;
        await this.storage.upload(fileKey, file.content, this.contentTypeFor(file.language));
      }

      await this.prisma.mcpProjectVersion.update({
        where: { id: versionId },
        data: {
          artifactPath: artifactKey,
          manifest: result.server as object,
        },
      });

      await this.prisma.mcpProject.update({
        where: { id: projectId },
        data: { status: 'validating' },
      });

      await this.prisma.job.updateMany({
        where: { projectId, type: 'generation' },
        data: {
          status: 'completed',
          result: { toolCount: result.server.tools.length, warnings: result.warnings } as object,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Generation complete for project ${projectId}: ${result.server.tools.length} tools`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Generation failed for project ${projectId}: ${message}`);

      await this.prisma.mcpProject.update({
        where: { id: projectId },
        data: { status: 'failed' },
      });

      await this.prisma.job.updateMany({
        where: { projectId, type: 'generation' },
        data: {
          status: 'failed',
          error: message,
          completedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      throw error;
    }
  }

  private contentTypeFor(language: string): string {
    const map: Record<string, string> = {
      typescript: 'text/typescript',
      json: 'application/json',
      markdown: 'text/markdown',
      yaml: 'text/yaml',
      dockerfile: 'text/plain',
    };
    return map[language] ?? 'text/plain';
  }
}
