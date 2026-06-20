import { Controller, Get, Post, Patch, Param, Body, Headers, ForbiddenException, Res } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  private checkKey(key: string) {
    if (key !== process.env.ADMIN_SECRET)
      throw new ForbiddenException('Acceso denegado');
  }

  // ─── Web UI ───────────────────────────────────────────────────────────────

  @Get()
  async dashboard(@Headers('x-admin-key') key: string, @Res() res: any) {
    this.checkKey(key);

    const [reports, bannedUsers] = await Promise.all([
      this.prisma.report.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          confession: { select: { id: true, text: true, hidden: true, user: { select: { alias: true, banned: true } } } },
          user: { select: { alias: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { banned: true },
        select: { id: true, alias: true, bannedReason: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return res.status(200).json({ reports, bannedUsers });
  }

  // ─── Confesiones ──────────────────────────────────────────────────────────

  @Patch('confessions/:id/hide')
  async hideConfession(@Param('id') id: string, @Headers('x-admin-key') key: string) {
    this.checkKey(key);
    await this.prisma.confession.update({ where: { id }, data: { hidden: true } });
    return { ok: true };
  }

  @Patch('confessions/:id/unhide')
  async unhideConfession(@Param('id') id: string, @Headers('x-admin-key') key: string) {
    this.checkKey(key);
    await this.prisma.confession.update({ where: { id }, data: { hidden: false } });
    return { ok: true };
  }

  @Patch('reports/:id/resolve')
  async resolveReport(@Param('id') id: string, @Headers('x-admin-key') key: string) {
    this.checkKey(key);
    await this.prisma.report.update({ where: { id }, data: { resolved: true } });
    return { ok: true };
  }

  // ─── Usuarios ─────────────────────────────────────────────────────────────

  @Post('users/:id/ban')
  async banUser(
    @Param('id') id: string,
    @Headers('x-admin-key') key: string,
    @Body('reason') reason: string,
  ) {
    this.checkKey(key);
    await this.prisma.user.update({
      where: { id },
      data: { banned: true, bannedReason: reason ?? 'Violación de términos de servicio' },
    });
    return { ok: true };
  }

  @Post('users/:id/unban')
  async unbanUser(@Param('id') id: string, @Headers('x-admin-key') key: string) {
    this.checkKey(key);
    await this.prisma.user.update({
      where: { id },
      data: { banned: false, bannedReason: null },
    });
    return { ok: true };
  }

  @Get('users/search/:alias')
  async findUser(@Param('alias') alias: string, @Headers('x-admin-key') key: string) {
    this.checkKey(key);
    return this.prisma.user.findUnique({
      where: { alias },
      select: { id: true, alias: true, email: true, banned: true, bannedReason: true, createdAt: true, ageVerifiedAt: true },
    });
  }
}
