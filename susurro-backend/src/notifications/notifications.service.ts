import { Injectable } from '@nestjs/common';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  async send(message: PushMessage) {
    if (!message.to?.startsWith('ExponentPushToken')) return;
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
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
    } catch {
      // Notifications are non-critical — fail silently
    }
  }
}
