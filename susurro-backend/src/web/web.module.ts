import { Module } from '@nestjs/common';
import { WebController } from './web.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WebController],
  providers: [PrismaService],
})
export class WebModule {}
