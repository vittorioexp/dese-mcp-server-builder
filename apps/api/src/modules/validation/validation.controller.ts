import { Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ValidationService } from './validation.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('validation')
@Controller('organizations/:organizationId/projects/:projectId/versions/:versionId/validate')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Post()
  @ApiOperation({ summary: 'Validate MCP server version' })
  validate(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.validationService.validateVersion(
      projectId,
      versionId,
      organizationId,
      req.user.id,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get validation history' })
  history(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.validationService.getValidationHistory(projectId, versionId, organizationId);
  }
}
