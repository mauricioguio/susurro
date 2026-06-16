import { Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  getAll(@Request() req: any) {
    return this.service.getForUser(req.user.sub);
  }

  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.service.getUnreadCount(req.user.sub).then(count => ({ count }));
  }

  @Patch('read-all')
  markAllRead(@Request() req: any) {
    return this.service.markAllRead(req.user.sub);
  }
}
