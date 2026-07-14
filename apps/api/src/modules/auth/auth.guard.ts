import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createHash } from 'crypto';

export interface AuthenticatedRequest {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  organizationId?: string;
  apiKey?: {
    id: string;
    scopes: string[];
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
    const orgHeader = request.headers['x-organization-id'] as string | undefined;

    if (apiKeyHeader) {
      const keyHash = createHash('sha256').update(apiKeyHeader).digest('hex');
      const apiKey = await this.prisma.apiKey.findFirst({
        where: {
          keyHash,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (!apiKey) {
        throw new UnauthorizedException('Invalid API key');
      }

      await this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      request.apiKey = { id: apiKey.id, scopes: apiKey.scopes };
      request.organizationId = apiKey.organizationId ?? orgHeader;
      return true;
    }

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const session = await this.prisma.session.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      request.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      };
      request.organizationId = orgHeader;
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }
}
