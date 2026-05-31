import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(alias: string, viewerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { alias },
      select: {
        id: true, alias: true, bio: true, createdAt: true,
        _count: { select: { confessions: true, followers: true, following: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isFollowing = viewerId ? await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
    }) : null;

    return { ...user, isFollowing: !!isFollowing };
  }

  async search(query: string, userId: string) {
    return this.prisma.user.findMany({
      where: { alias: { contains: query, mode: 'insensitive' }, NOT: { id: userId } },
      select: { alias: true, bio: true, _count: { select: { followers: true } } },
      take: 20,
    });
  }

  async follow(followerId: string, alias: string) {
    const target = await this.prisma.user.findUnique({ where: { alias } });
    if (!target) throw new NotFoundException();

    const exists = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: target.id } },
    });

    if (exists) {
      await this.prisma.follow.delete({ where: { id: exists.id } });
      return { following: false };
    }
    await this.prisma.follow.create({ data: { followerId, followingId: target.id } });
    return { following: true };
  }

  async updateBio(userId: string, bio: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { bio },
      select: { alias: true, bio: true },
    });
  }
}
