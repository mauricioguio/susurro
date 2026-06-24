import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/messages' })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // userId → Set of socket IDs (a user can have multiple tabs/devices)
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly messagesService: MessagesService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) { client.disconnect(); return; }
    try {
      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      client.data.userId = payload.sub;
      if (!this.userSockets.has(payload.sub)) this.userSockets.set(payload.sub, new Set());
      this.userSockets.get(payload.sub)!.add(client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(userId);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; text: string },
  ) {
    const userId = client.data.userId as string;
    if (!userId || !payload?.conversationId || !payload?.text?.trim()) return;

    try {
      const message = await this.messagesService.sendMessage(userId, payload.conversationId, payload.text.trim());
      const otherUserId = await this.messagesService.getOtherParticipantId(payload.conversationId, userId);

      // Emit to all sockets of the sender (other devices)
      const senderSockets = this.userSockets.get(userId);
      if (senderSockets) {
        for (const sid of senderSockets) {
          if (sid !== client.id) {
            this.server.to(sid).emit('newMessage', message);
          }
        }
      }

      // Emit to the recipient's sockets
      if (otherUserId) {
        const recipientSockets = this.userSockets.get(otherUserId);
        if (recipientSockets) {
          for (const sid of recipientSockets) {
            this.server.to(sid).emit('newMessage', message);
          }
        }
      }

      // Ack to sender's current socket
      return { event: 'messageSent', data: message };
    } catch {
      return { event: 'error', data: 'No se pudo enviar el mensaje' };
    }
  }
}
