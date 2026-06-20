import { Controller, Get, Post, Patch, Param, Body, Headers, ForbiddenException, Res, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  private checkKey(key: string) {
    if (!key || key !== process.env.ADMIN_SECRET)
      throw new ForbiddenException('Acceso denegado');
  }

  // ─── Web UI ───────────────────────────────────────────────────────────────

  @Get()
  async dashboard(@Query('key') key: string, @Res() res: any) {
    this.checkKey(key);

    const [reports, bannedUsers] = await Promise.all([
      this.prisma.report.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          confession: {
            select: {
              id: true, text: true, hidden: true, audioUrl: true,
              user: { select: { id: true, alias: true, banned: true } },
            },
          },
          user: { select: { alias: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { banned: true },
        select: { id: true, alias: true, bannedReason: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const html = this.buildHtml(key, reports, bannedUsers);
    return res.status(200).send(html);
  }

  // ─── API endpoints ────────────────────────────────────────────────────────

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

  // ─── HTML ─────────────────────────────────────────────────────────────────

  private e(s: string) {
    return (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  private buildHtml(key: string, reports: any[], bannedUsers: any[]) {
    const base = 'https://susurro-production.up.railway.app';

    const reportRows = reports.map(r => {
      const c = r.confession;
      const content = c.audioUrl ? '🎙️ Nota de voz' : (c.text?.slice(0, 120) ?? '');
      const hidden = c.hidden ? '🚫 Oculta' : '✅ Visible';
      const banned = c.user.banned ? '🔴 Baneado' : '';
      return `
        <tr>
          <td>${this.e(r.user.alias)}</td>
          <td>${this.e(r.reason)}</td>
          <td class="content">${this.e(content)}</td>
          <td>${hidden}</td>
          <td>${this.e(c.user.alias)} ${banned}</td>
          <td>
            ${c.hidden
              ? `<button onclick="act('PATCH','${base}/admin/confessions/${c.id}/unhide')">Mostrar</button>`
              : `<button class="danger" onclick="act('PATCH','${base}/admin/confessions/${c.id}/hide')">Ocultar</button>`
            }
            ${!c.user.banned
              ? `<button class="danger" onclick="banUser('${c.user.id}')">Banear usuario</button>`
              : `<button onclick="act('POST','${base}/admin/users/${c.user.id}/unban')">Desbanear</button>`
            }
            <button onclick="act('PATCH','${base}/admin/reports/${r.id}/resolve')">Resolver reporte</button>
          </td>
        </tr>`;
    }).join('');

    const bannedRows = bannedUsers.map(u => `
      <tr>
        <td>${this.e(u.alias)}</td>
        <td>${this.e(u.bannedReason ?? '')}</td>
        <td>${new Date(u.createdAt).toLocaleDateString('es')}</td>
        <td><button onclick="act('POST','${base}/admin/users/${u.id}/unban')">Desbanear</button></td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Susurro Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #0d0d0d; color: #e0e0e0; padding: 24px; }
    h1 { font-size: 22px; font-weight: 300; font-style: italic; color: #fff; margin-bottom: 4px; }
    h2 { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 400; text-transform: uppercase;
         letter-spacing: 1px; margin: 28px 0 12px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.08); border-radius: 20px;
             padding: 2px 10px; font-size: 12px; margin-left: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; color: rgba(255,255,255,0.35);
         border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 500; }
    td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05);
         vertical-align: top; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .content { max-width: 280px; color: rgba(255,255,255,0.6); }
    button { font-size: 12px; padding: 5px 10px; border-radius: 6px; border: none;
             cursor: pointer; margin: 2px; background: rgba(255,255,255,0.1);
             color: #fff; transition: opacity .15s; }
    button:hover { opacity: 0.8; }
    button.danger { background: rgba(200,0,0,0.4); }
    .empty { color: rgba(255,255,255,0.25); font-size: 13px; padding: 16px 0; }
    #toast { position: fixed; bottom: 24px; right: 24px; background: #222;
             color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 13px;
             display: none; border: 1px solid rgba(255,255,255,0.1); }
  </style>
</head>
<body>
  <h1>susurro <span style="font-style:normal;font-size:14px;color:rgba(255,255,255,0.3)">panel de moderación</span></h1>

  <h2>Reportes pendientes <span class="badge">${reports.length}</span></h2>
  ${reports.length === 0
    ? '<p class="empty">Sin reportes pendientes.</p>'
    : `<table>
        <thead><tr>
          <th>Reportado por</th><th>Razón</th><th>Contenido</th>
          <th>Estado</th><th>Autor</th><th>Acciones</th>
        </tr></thead>
        <tbody>${reportRows}</tbody>
      </table>`
  }

  <h2>Usuarios baneados <span class="badge">${bannedUsers.length}</span></h2>
  ${bannedUsers.length === 0
    ? '<p class="empty">Sin usuarios baneados.</p>'
    : `<table>
        <thead><tr><th>Alias</th><th>Razón</th><th>Fecha</th><th>Acciones</th></tr></thead>
        <tbody>${bannedRows}</tbody>
      </table>`
  }

  <div id="toast"></div>

  <script>
    const KEY = '${this.e(key)}';

    async function act(method, url, body) {
      try {
        const r = await fetch(url, {
          method,
          headers: { 'x-admin-key': KEY, 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (r.ok) { showToast('✓ Listo'); setTimeout(() => location.reload(), 800); }
        else { const d = await r.json(); showToast('Error: ' + (d.message ?? r.status)); }
      } catch(e) { showToast('Error de red'); }
    }

    function banUser(id) {
      const reason = prompt('Razón del baneo:');
      if (!reason) return;
      act('POST', '${base}/admin/users/' + id + '/ban', { reason });
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.style.display = 'block';
      setTimeout(() => t.style.display = 'none', 2500);
    }
  </script>
</body>
</html>`;
  }
}
