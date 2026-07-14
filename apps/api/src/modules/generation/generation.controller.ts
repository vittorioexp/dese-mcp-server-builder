import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GenerationService } from './generation.service';
import { AuthGuard } from '../auth/auth.guard';
import { IsOptional, IsObject, IsBoolean, IsString } from 'class-validator';

class TriggerGenerationBody {
  @IsOptional()
  @IsObject()
  options?: {
    includeTests?: boolean;
    includeDocker?: boolean;
    includeDocs?: boolean;
    toolNamePrefix?: string;
    enableStreaming?: boolean;
  };
}

@ApiTags('generation')
@Controller('organizations/:organizationId/projects/:projectId/generate')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post()
  @ApiOperation({ summary: 'Trigger MCP server generation' })
  trigger(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() body: TriggerGenerationBody,
    @Req() req: { user: { id: string } },
  ) {
    return this.generationService.trigger(
      projectId,
      organizationId,
      req.user.id,
      body.options,
    );
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get generation job status' })
  status(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.generationService.getJobStatus(projectId, jobId);
  }
}
