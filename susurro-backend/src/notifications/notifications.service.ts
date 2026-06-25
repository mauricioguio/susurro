import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async send(message: PushMessage) {
    if (!message.to?.startsWith('ExponentPushToken')) {
      console.log(`[Push] skipped — token format invalid: ${message.to?.slice(0, 40)}`);
      return;
    }
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          to: message.to,
          sound: 'default',
          title: message.title,
          body: message.body,
          data: message.data ?? {},
        }),
      });
      const result = await res.json();
      console.log(`[Push] result: ${JSON.stringify(result)}`);
    } catch (e) {
      console.error('[Push] fetch error:', e);
    }
  }

  async save(userId: string, type: string, message: string, confessionId?: string) {
    try {
      await this.prisma.notification.create({
        data: { userId, type, message, confessionId: confessionId ?? null },
      });
    } catch {}
  }

  async getForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
