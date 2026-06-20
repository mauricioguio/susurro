import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ConfessionsModule } from './confessions/confessions.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebModule } from './web/web.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificationsModule,
    AuthModule,
    ConfessionsModule,
    UsersModule,
    WebModule,
  ],
})
export class AppModule {}
