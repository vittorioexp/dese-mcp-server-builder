import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../auth/auth.guard';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { SUPPORTED_INPUT_SOURCES } from '@dese-mcp/shared';

class CreateProjectBody {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SUPPORTED_INPUT_SOURCES)
  inputSource!: (typeof SUPPORTED_INPUT_SOURCES)[number];

  @IsObject()
  inputConfig!: Record<string, unknown>;
}

class UpdateProjectBody {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  inputConfig?: Record<string, unknown>;
}

@ApiTags('projects')
@Controller('organizations/:organizationId/projects')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Organization-Id', required: false })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List MCP projects' })
  list(
    @Param('organizationId') organizationId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Req() req: { user: { id: string } },
  ) {
    return this.projectsService.list(
      organizationId,
      req.user.id,
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get project by ID' })
  get(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.projectsService.findById(projectId, organizationId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create MCP project' })
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateProjectBody,
    @Req() req: { user: { id: string } },
  ) {
    return this.projectsService.create(organizationId, req.user.id, body);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectBody,
    @Req() req: { user: { id: string } },
  ) {
    return this.projectsService.update(projectId, organizationId, req.user.id, body);
  }

  @Delete(':projectId')
  @ApiOperation({ summary: 'Delete project' })
  delete(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.projectsService.delete(projectId, organizationId, req.user.id);
  }

  @Get(':projectId/versions')
  @ApiOperation({ summary: 'List project versions' })
  versions(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.projectsService.listVersions(projectId, organizationId, req.user.id);
  }
}
