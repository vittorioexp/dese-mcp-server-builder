import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { AuthGuard } from '../auth/auth.guard';
import { IsEnum } from 'class-validator';
import { SUPPORTED_EXPORT_FORMATS } from '@dese-mcp/shared';

class ExportBody {
  @IsEnum(SUPPORTED_EXPORT_FORMATS)
  format!: (typeof SUPPORTED_EXPORT_FORMATS)[number];
}

@ApiTags('export')
@Controller('organizations/:organizationId/projects/:projectId/versions/:versionId/export')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @ApiOperation({ summary: 'Export validated MCP server project' })
  export(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Body() body: ExportBody,
    @Req() req: { user: { id: string } },
  ) {
    return this.exportService.exportProject(
      projectId,
      versionId,
      organizationId,
      req.user.id,
      body.format,
    );
  }
}
