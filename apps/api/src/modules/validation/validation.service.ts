import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { validateMcpServer } from '@dese-mcp/mcp-core';
import type { GeneratedMcpServer, ValidationResult } from '@dese-mcp/shared';

@Injectable()
export class ValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async validateVersion(
    projectId: string,
    versionId: string,
    organizationId: string,
    userId: string,
  ): Promise<ValidationResult> {
    const project = await this.prisma.mcpProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const version = await this.prisma.mcpProjectVersion.findFirst({
      where: { id: versionId, projectId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    if (!version.manifest && !version.artifactPath) {
      throw new BadRequestException('Version has no generated artifacts to validate');
    }

    let server: GeneratedMcpServer;

    if (version.manifest) {
      server = version.manifest as unknown as GeneratedMcpServer;
    } else if (version.artifactPath) {
      const content = await this.storage.download(version.artifactPath);
      const manifest = JSON.parse(content.toString()) as { server: GeneratedMcpServer };
      server = manifest.server;
    } else {
      throw new BadRequestException('No manifest available');
    }

    const result = validateMcpServer(server, { strict: true });

    await this.prisma.validationRun.create({
      data: {
        versionId,
        valid: result.valid,
        issues: result.issues as object[],
        durationMs: result.durationMs,
      },
    });

    if (result.valid) {
      await this.prisma.mcpProjectVersion.update({
        where: { id: versionId },
        data: { isValidated: true },
      });

      await this.prisma.mcpProject.update({
        where: { id: projectId },
        data: { status: 'ready' },
      });
    } else {
      await this.prisma.mcpProject.update({
        where: { id: projectId },
        data: { status: 'failed' },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'validation.run',
        resource: 'mcp_project_version',
        resourceId: versionId,
        metadata: { valid: result.valid, issueCount: result.issues.length },
      },
    });

    return result;
  }

  async getValidationHistory(
    projectId: string,
    versionId: string,
    organizationId: string,
  ): Promise<
    Array<{
      id: string;
      valid: boolean;
      issues: unknown;
      durationMs: number;
      createdAt: string;
    }>
  > {
    const project = await this.prisma.mcpProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const runs = await this.prisma.validationRun.findMany({
      where: { versionId },
      orderBy: { createdAt: 'desc' },
    });

    return runs.map((run) => ({
      id: run.id,
      valid: run.valid,
      issues: run.issues,
      durationMs: run.durationMs,
      createdAt: run.createdAt.toISOString(),
    }));
  }
}
