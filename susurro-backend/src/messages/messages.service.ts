import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(userId: string, targetAlias: string) {
    const target = await this.prisma.user.findUnique({ where: { alias: targetAlias } });
    if (!target) throw new NotFoundException('Usuario no encontrado');
    if (target.id === userId) throw new ForbiddenException('No puedes enviarte mensajes a ti mismo');

    // Check if conversation already exists between these two users
    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: target.id } } },
        ],
      },
      include: {
        participants: { include: { user: { select: { alias: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: target.id }],
        },
      },
      include: {
        participants: { include: { user: { select: { alias: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async getConversations(userId: string) {
    const convos = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { alias: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return convos.map(c => ({
      id: c.id,
      updatedAt: c.updatedAt,
      other: c.participants.find(p => p.userId !== userId)?.user,
      lastMessage: c.messages[0] ?? null,
      unread: 0, // computed below
    }));
  }

  async getMessages(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException();

    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, read: false },
      data: { read: true },
    });

    return this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { alias: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(userId: string, conversationId: string, text: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException();

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { text, conversationId, senderId: userId },
        include: { sender: { select: { alias: true, avatarUrl: true } } },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  async markMessagesRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, read: false },
      data: { read: true },
    });
  }

  async getOtherParticipantId(conversationId: string, userId: string): Promise<string | null> {
    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    return other?.userId ?? null;
  }
}
