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

  // userId → Set of socket IDs
  private userSockets = new Map<string, Set<string>>();
  // conversationId → Set of userIds currently viewing that chat
  private conversationPresence = new Map<string, Set<string>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly messagesService: MessagesService,
  ) {}

  private emitToUser(userId: string, event: string, data: any, excludeSocketId?: string) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    for (const sid of sockets) {
      if (sid !== excludeSocketId) this.server.to(sid).emit(event, data);
    }
  }

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

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        // Notify partners in any conversation this user was viewing
        for (const [convId, users] of this.conversationPresence.entries()) {
          if (users.has(userId)) {
            users.delete(userId);
            const otherId = await this.messagesService.getOtherParticipantId(convId, userId);
            if (otherId) {
              this.emitToUser(otherId, 'partnerStatus', { conversationId: convId, isOnline: false });
            }
          }
        }
      }
    }
  }

  @SubscribeMessage('enterConversation')
  async handleEnterConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const userId = client.data.userId as string;
    const { conversationId } = payload;
    if (!userId || !conversationId) return;

    if (!this.conversationPresence.has(conversationId)) {
      this.conversationPresence.set(conversationId, new Set());
    }
    this.conversationPresence.get(conversationId)!.add(userId);

    const otherId = await this.messagesService.getOtherParticipantId(conversationId, userId);
    if (!otherId) return;

    // Tell me if partner is online in this chat
    const partnerInConvo = this.conversationPresence.get(conversationId)?.has(otherId) ?? false;
    client.emit('partnerStatus', { conversationId, isOnline: partnerInConvo });

    // Tell partner I'm here
    this.emitToUser(otherId, 'partnerStatus', { conversationId, isOnline: true });
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const userId = client.data.userId as string;
    const { conversationId } = payload;
    if (!userId || !conversationId) return;

    this.conversationPresence.get(conversationId)?.delete(userId);

    const otherId = await this.messagesService.getOtherParticipantId(conversationId, userId);
    if (otherId) {
      this.emitToUser(otherId, 'partnerStatus', { conversationId, isOnline: false });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId as string;
    if (!userId || !payload?.conversationId) return;

    const otherId = await this.messagesService.getOtherParticipantId(payload.conversationId, userId);
    if (otherId) {
      this.emitToUser(otherId, 'partnerTyping', {
        conversationId: payload.conversationId,
        isTyping: payload.isTyping,
      });
    }
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const userId = client.data.userId as string;
    if (!userId || !payload?.conversationId) return;

    await this.messagesService.markMessagesRead(payload.conversationId, userId);

    const otherId = await this.messagesService.getOtherParticipantId(payload.conversationId, userId);
    if (otherId) {
      this.emitToUser(otherId, 'messagesRead', { conversationId: payload.conversationId });
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

      // Confirm to sender (current socket only)
      client.emit('messageSent', message);

      // Sync sender's other devices
      this.emitToUser(userId, 'newMessage', message, client.id);

      // Deliver to recipient
      if (otherUserId) {
        this.emitToUser(otherUserId, 'newMessage', message);
      }
    } catch {
      client.emit('messageError', { error: 'No se pudo enviar el mensaje' });
    }
  }
}
