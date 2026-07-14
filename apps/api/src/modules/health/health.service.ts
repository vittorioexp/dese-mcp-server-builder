import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { HealthCheck } from '@dese-mcp/shared';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheck> {
    const services: HealthCheck['services'] = {};

    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = { status: 'up', latencyMs: Date.now() - dbStart };
    } catch {
      services.database = { status: 'down' };
    }

    const allUp = Object.values(services).every((s) => s.status === 'up');

    return {
      status: allUp ? 'ok' : 'degraded',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
