import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GENERATION_QUEUE } from '@dese-mcp/shared';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { GenerationProcessor } from './generation.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: GENERATION_QUEUE }),
  ],
  controllers: [GenerationController],
  providers: [GenerationService, GenerationProcessor],
  exports: [GenerationService],
})
export class GenerationModule {}
