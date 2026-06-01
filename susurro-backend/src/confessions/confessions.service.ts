import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ConfessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, text: string) {
    return this.prisma.confession.create({
      data: { userId, text },
      include: { user: { select: { alias: true } }, _count: { select: { reactions: true, comments: true } } },
    });
  }

  async getFeed(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const ids = [userId, ...following.map(f => f.followingId)];
    return this.prisma.confession.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: {
        user: { select: { alias: true } },
        _count: { select: { reactions: true, comments: true } },
        reactions: { where: { userId }, select: { type: true } },
      },
    });
  }

  async getExplore(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    return this.prisma.confession.findMany({
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: {
        user: { select: { alias: true } },
        _count: { select: { reactions: true, comments: true } },
        reactions: { where: { userId }, select: { type: true } },
      },
    });
  }

  async getByUser(alias: string, userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const user = await this.prisma.user.findUnique({ where: { alias } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.confession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: {
        user: { select: { alias: true } },
        _count: { select: { reactions: true, comments: true } },
        reactions: { where: { userId }, select: { type: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const confession = await this.prisma.confession.findUnique({ where: { id } });
    if (!confession) throw new NotFoundException();
    if (confession.userId !== userId) throw new ForbiddenException();
    await this.prisma.confession.delete({ where: { id } });
    return { deleted: true };
  }

  async react(confessionId: string, userId: string, type: string) {
    const exists = await this.prisma.reaction.findUnique({
      where: { userId_confessionId_type: { userId, confessionId, type } },
    });
    if (exists) {
      await this.prisma.reaction.delete({ where: { id: exists.id } });
      return { reacted: false };
    }

    await this.prisma.reaction.create({ data: { userId, confessionId, type } });

    // Notify confession owner (if not reacting to own confession)
    const confession = await this.prisma.confession.findUnique({
      where: { id: confessionId },
      include: { user: { select: { pushToken: true, id: true } } },
    });
    if (confession && confession.userId !== userId && confession.user.pushToken) {
      const reactor = await this.prisma.user.findUnique({ where: { id: userId }, select: { alias: true } });
      await this.notifications.send({
        to: confession.user.pushToken,
        title: `${type} en tu susurro`,
        body: `@${reactor?.alias} reaccionó a tu confesión`,
        data: { type: 'reaction', confessionId },
      });
    }

    return { reacted: true };
  }

  async getComments(confessionId: string) {
    return this.prisma.comment.findMany({
      where: { confessionId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { alias: true } } },
    });
  }

  async addComment(confessionId: string, userId: string, text: string) {
    const comment = await this.prisma.comment.create({
      data: { confessionId, userId, text },
      include: { user: { select: { alias: true } } },
    });

    // Notify confession owner (if not commenting on own confession)
    const confession = await this.prisma.confession.findUnique({
      where: { id: confessionId },
      include: { user: { select: { pushToken: true, id: true } } },
    });
    if (confession && confession.userId !== userId && confession.user.pushToken) {
      await this.notifications.send({
        to: confession.user.pushToken,
        title: 'Nuevo comentario',
        body: `@${comment.user.alias}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
        data: { type: 'comment', confessionId },
      });
    }

    return comment;
  }

  async report(confessionId: string, userId: string, reason: string) {
    return this.prisma.report.upsert({
      where: { userId_confessionId: { userId, confessionId } },
      update: { reason },
      create: { userId, confessionId, reason },
    });
  }
}
