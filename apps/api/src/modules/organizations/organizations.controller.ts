import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { AuthGuard } from '../auth/auth.guard';
import { IsString, MinLength, MaxLength } from 'class-validator';

class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organizations for current user' })
  list(@Req() req: { user: { id: string } }) {
    return this.organizationsService.findForUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  get(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.organizationsService.findById(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  create(@Body() dto: CreateOrganizationDto, @Req() req: { user: { id: string } }) {
    return this.organizationsService.create(req.user.id, dto.name);
  }
}
