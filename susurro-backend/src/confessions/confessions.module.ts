import { Module } from '@nestjs/common';
import { ConfessionsController } from './confessions.controller';
import { ConfessionsService } from './confessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [ConfessionsController],
  providers: [ConfessionsService, PrismaService, NotificationsService],
})
export class ConfessionsModule {}
