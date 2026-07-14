import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import type { ExportFormat, ExportResult } from '@dese-mcp/shared';
import { exportFormatSchema } from '@dese-mcp/shared';

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async exportProject(
    projectId: string,
    versionId: string,
    organizationId: string,
    userId: string,
    format: ExportFormat,
  ): Promise<ExportResult> {
    exportFormatSchema.parse(format);

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

    if (!version.isValidated) {
      throw new ForbiddenException(
        'Project version must pass validation before export',
      );
    }

    if (!version.artifactPath) {
      throw new BadRequestException('No artifacts available for export');
    }

    const filesPrefix = `projects/${projectId}/versions/${versionId}/files/`;
    const zipBuffer = await this.createZipArchive(filesPrefix);

    const exportKey = `exports/${projectId}/${versionId}/${format}-${Date.now()}.zip`;
    await this.storage.upload(exportKey, zipBuffer, 'application/zip');

    const downloadUrl = await this.storage.getSignedDownloadUrl(exportKey, 3600);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'export.create',
        resource: 'mcp_project_version',
        resourceId: versionId,
        metadata: { format, exportKey },
      },
    });

    return {
      downloadUrl,
      format,
      sizeBytes: zipBuffer.length,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  private async createZipArchive(filesPrefix: string): Promise<Buffer> {
    const manifestContent = await this.storage.download(`${filesPrefix}../manifest.json`);
    const manifest = JSON.parse(manifestContent.toString()) as {
      server: { name: string };
    };

    return new Promise((resolve, reject) => {
      const passThrough = new PassThrough();
      const chunks: Buffer[] = [];

      passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
      passThrough.on('end', () => resolve(Buffer.concat(chunks)));
      passThrough.on('error', reject);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(passThrough);

      archive.append(manifestContent, { name: 'manifest.json' });

      const knownFiles = [
        'package.json',
        'tsconfig.json',
        'README.md',
        'Dockerfile',
        'docker-compose.yml',
        'src/index.ts',
        'src/server.ts',
        'src/config.ts',
        'src/tools/index.ts',
        'src/resources/index.ts',
        'src/prompts/index.ts',
        'src/lib/http-client.ts',
      ];

      const appendPromises = knownFiles.map(async (filePath) => {
        try {
          const content = await this.storage.download(`${filesPrefix}${filePath}`);
          archive.append(content, { name: filePath });
        } catch {
          // File may not exist for all projects
        }
      });

      Promise.all(appendPromises)
        .then(() => archive.finalize())
        .catch(reject);
    });
  }
}
