import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '@dese-mcp/database';
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectDto,
  type UpdateProjectDto,
} from '@dese-mcp/shared';
import type { McpProject, PaginatedResponse } from '@dese-mcp/shared';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<McpProject>> {
    await this.ensureMembership(organizationId, userId);

    const skip = (page - 1) * pageSize;
    const [projects, total] = await Promise.all([
      this.prisma.mcpProject.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.mcpProject.count({ where: { organizationId } }),
    ]);

    return {
      data: projects.map(this.toProjectDto),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(projectId: string, organizationId: string, userId: string): Promise<McpProject> {
    await this.ensureMembership(organizationId, userId);

    const project = await this.prisma.mcpProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.toProjectDto(project);
  }

  async create(
    organizationId: string,
    userId: string,
    input: CreateProjectDto,
  ): Promise<McpProject> {
    await this.ensureMembership(organizationId, userId, ['owner', 'admin', 'developer']);

    const parsed = createProjectSchema.parse(input);
    const slug = this.generateSlug(parsed.name);

    const existing = await this.prisma.mcpProject.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
    });

    if (existing) {
      throw new BadRequestException('A project with this name already exists');
    }

    const project = await this.prisma.mcpProject.create({
      data: {
        organizationId,
        name: parsed.name,
        slug,
        description: parsed.description,
        inputSource: parsed.inputSource,
        inputConfig: parsed.inputConfig as Prisma.InputJsonValue,
        status: 'draft',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'project.create',
        resource: 'mcp_project',
        resourceId: project.id,
        metadata: { name: project.name, inputSource: project.inputSource },
      },
    });

    return this.toProjectDto(project);
  }

  async update(
    projectId: string,
    organizationId: string,
    userId: string,
    input: UpdateProjectDto,
  ): Promise<McpProject> {
    await this.ensureMembership(organizationId, userId, ['owner', 'admin', 'developer']);

    const parsed = updateProjectSchema.parse(input);

    const project = await this.prisma.mcpProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updated = await this.prisma.mcpProject.update({
      where: { id: projectId },
      data: {
        name: parsed.name,
        description: parsed.description,
        inputConfig: parsed.inputConfig as Prisma.InputJsonValue,
      },
    });

    return this.toProjectDto(updated);
  }

  async delete(projectId: string, organizationId: string, userId: string): Promise<void> {
    await this.ensureMembership(organizationId, userId, ['owner', 'admin']);

    const project = await this.prisma.mcpProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.mcpProject.delete({ where: { id: projectId } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'project.delete',
        resource: 'mcp_project',
        resourceId: projectId,
      },
    });
  }

  async listVersions(projectId: string, organizationId: string, userId: string) {
    await this.ensureMembership(organizationId, userId);

    const project = await this.prisma.mcpProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const versions = await this.prisma.mcpProjectVersion.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      projectId: v.projectId,
      version: v.version,
      changelog: v.changelog,
      artifactPath: v.artifactPath,
      isValidated: v.isValidated,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  private async ensureMembership(
    organizationId: string,
    userId: string,
    allowedRoles?: string[],
  ): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    if (allowedRoles && !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }

  private toProjectDto(project: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description: string | null;
    inputSource: string;
    inputConfig: unknown;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): McpProject {
    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      slug: project.slug,
      description: project.description,
      inputSource: project.inputSource as McpProject['inputSource'],
      inputConfig: project.inputConfig as Record<string, unknown>,
      status: project.status as McpProject['status'],
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}
