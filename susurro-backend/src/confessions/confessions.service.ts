import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const CONFESSION_INCLUDE = (userId: string) => ({
  user: { select: { alias: true } },
  _count: { select: { reactions: true, comments: true, replies: true } },
  reactions: { where: { userId }, select: { type: true } },
  bookmarks: { where: { userId }, select: { id: true } },
  pollVotes: { select: { vote: true, userId: true } },
});

function mapConfession(c: any, userId: string) {
  const yesVotes = c.pollVotes?.filter((v: any) => v.vote === true).length ?? 0;
  const noVotes  = c.pollVotes?.filter((v: any) => v.vote === false).length ?? 0;
  const userVoteObj = c.pollVotes?.find((v: any) => v.userId === userId);
  return {
    ...c,
    bookmarked: c.bookmarks?.length > 0,
    bookmarks: undefined,
    replyCount: c._count?.replies ?? 0,
    pollResult: c.pollQuestion
      ? { yes: yesVotes, no: noVotes, userVote: userVoteObj ? userVoteObj.vote : null }
      : null,
    pollVotes: undefined,
  };
}

@Injectable()
export class ConfessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, data: {
    text?: string;
    audioUrl?: string;
    tags?: string[];
    expiresAt?: string;
    pollQuestion?: string;
    parentId?: string;
  }) {
    const confession = await this.prisma.confession.create({
      data: {
        userId,
        text: data.text ?? null,
        audioUrl: data.audioUrl ?? null,
        tags: data.tags ?? [],
        pollQuestion: data.pollQuestion ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        parentId: data.parentId ?? null,
      },
      include: CONFESSION_INCLUDE(userId),
    });

    if (data.parentId) {
      const parent = await this.prisma.confession.findUnique({ where: { id: data.parentId }, select: { userId: true } });
      if (parent && parent.userId !== userId) {
        const author = await this.prisma.user.findUnique({ where: { id: userId }, select: { alias: true } });
        await this.notifications.save(parent.userId, 'reply', `🔗 @${author?.alias} encadenó tu confesión`, data.parentId);
      }
    }

    return mapConfession(confession, userId);
  }

  private notExpired() {
    return {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };
  }

  async getFeed(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const ids = [userId, ...following.map(f => f.followingId)];
    const rows = await this.prisma.confession.findMany({
      where: { userId: { in: ids }, ...this.notExpired() },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: CONFESSION_INCLUDE(userId),
    });
    return rows.map(c => mapConfession(c, userId));
  }

  async getExplore(userId: string, page = 1, tag?: string) {
    const take = 20;
    const skip = (page - 1) * take;
    const rows = await this.prisma.confession.findMany({
      where: {
        ...this.notExpired(),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: CONFESSION_INCLUDE(userId),
    });
    return rows.map(c => mapConfession(c, userId));
  }

  async getTrending(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const rows = await this.prisma.confession.findMany({
      where: { createdAt: { gte: since }, ...this.notExpired() },
      orderBy: { reactions: { _count: 'desc' } },
      take, skip,
      include: CONFESSION_INCLUDE(userId),
    });
    return rows.map(c => mapConfession(c, userId));
  }

  async getByUser(alias: string, userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const user = await this.prisma.user.findUnique({ where: { alias } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const rows = await this.prisma.confession.findMany({
      where: { userId: user.id, ...this.notExpired() },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: CONFESSION_INCLUDE(userId),
    });
    return rows.map(c => mapConfession(c, userId));
  }

  async search(userId: string, q: string) {
    if (!q.trim()) return [];
    const rows = await this.prisma.confession.findMany({
      where: {
        ...this.notExpired(),
        OR: [
          { text: { contains: q, mode: 'insensitive' } },
          { tags: { has: q.startsWith('#') ? q : `#${q}` } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: CONFESSION_INCLUDE(userId),
    });
    return rows.map(c => mapConfession(c, userId));
  }

  async getById(id: string, userId: string) {
    const c = await this.prisma.confession.findUnique({
      where: { id },
      include: CONFESSION_INCLUDE(userId),
    });
    if (!c) throw new NotFoundException('Confesión no encontrada');
    return mapConfession(c, userId);
  }

  async getReplies(confessionId: string, userId: string) {
    const [parent, replies] = await Promise.all([
      this.prisma.confession.findUnique({
        where: { id: confessionId },
        include: CONFESSION_INCLUDE(userId),
      }),
      this.prisma.confession.findMany({
        where: { parentId: confessionId },
        orderBy: { createdAt: 'asc' },
        include: CONFESSION_INCLUDE(userId),
      }),
    ]);
    return {
      parent: parent ? mapConfession(parent, userId) : null,
      replies: replies.map(c => mapConfession(c, userId)),
    };
  }

  async getTags() {
    const rows = await this.prisma.confession.findMany({
      where: { tags: { isEmpty: false }, ...this.notExpired() },
      select: { tags: true },
    });
    const counts: Record<string, number> = {};
    for (const { tags } of rows) {
      for (const tag of tags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag, count]) => ({ tag, count }));
  }

  async getBookmarks(userId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { confession: { include: CONFESSION_INCLUDE(userId) } },
    });
    return bookmarks
      .filter(b => {
        const c = b.confession;
        if (!c.expiresAt) return true;
        return new Date(c.expiresAt) > new Date();
      })
      .map(b => mapConfession(b.confession, userId));
  }

  async toggleBookmark(confessionId: string, userId: string) {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_confessionId: { userId, confessionId } },
    });
    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
    await this.prisma.bookmark.create({ data: { userId, confessionId } });
    return { bookmarked: true };
  }

  async votePoll(confessionId: string, userId: string, vote: boolean) {
    const existing = await this.prisma.pollVote.findUnique({
      where: { userId_confessionId: { userId, confessionId } },
    });
    if (existing) {
      if (existing.vote === vote) {
        await this.prisma.pollVote.delete({ where: { id: existing.id } });
        return { voted: false };
      }
      await this.prisma.pollVote.update({ where: { id: existing.id }, data: { vote } });
      return { voted: true };
    }
    await this.prisma.pollVote.create({ data: { userId, confessionId, vote } });
    return { voted: true };
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

    const confession = await this.prisma.confession.findUnique({
      where: { id: confessionId },
      include: { user: { select: { pushToken: true, id: true } } },
    });
    if (confession && confession.userId !== userId) {
      const reactor = await this.prisma.user.findUnique({ where: { id: userId }, select: { alias: true } });
      const msg = `${type} @${reactor?.alias} reaccionó a tu confesión`;
      await this.notifications.save(confession.userId, 'reaction', msg, confessionId);
      if (confession.user.pushToken) {
        await this.notifications.send({
          to: confession.user.pushToken,
          title: `${type} en tu susurro`,
          body: `@${reactor?.alias} reaccionó a tu confesión`,
          data: { type: 'reaction', confessionId },
        });
      }
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

    const confession = await this.prisma.confession.findUnique({
      where: { id: confessionId },
      include: { user: { select: { pushToken: true, id: true } } },
    });
    if (confession && confession.userId !== userId) {
      const msg = `💬 @${comment.user.alias} comentó en tu confesión`;
      await this.notifications.save(confession.userId, 'comment', msg, confessionId);
      if (confession.user.pushToken) {
        await this.notifications.send({
          to: confession.user.pushToken,
          title: 'Nuevo comentario',
          body: `@${comment.user.alias}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
          data: { type: 'comment', confessionId },
        });
      }
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
