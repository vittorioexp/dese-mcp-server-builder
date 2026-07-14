import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      createdAt: m.organization.createdAt.toISOString(),
    }));
  }

  async findById(id: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: id, userId } },
      include: { organization: true },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
      createdAt: membership.organization.createdAt.toISOString(),
    };
  }

  async create(userId: string, name: string) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const org = await this.prisma.organization.create({
      data: {
        name,
        slug: `${slug}-${Date.now().toString(36)}`,
        members: {
          create: { userId, role: 'owner' },
        },
      },
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: 'owner',
      createdAt: org.createdAt.toISOString(),
    };
  }
}
