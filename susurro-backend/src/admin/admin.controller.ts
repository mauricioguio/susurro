import { Controller, Get, Post, Patch, Param, Body, Headers, ForbiddenException, Res } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BASE = 'https://susurro-production.up.railway.app';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  private checkKey(key: string) {
    if (!key || key !== process.env.ADMIN_SECRET)
      throw new ForbiddenException('Acceso denegado');
  }

  // ─── Página login ─────────────────────────────────────────────────────────

  @Get()
  loginPage(@Res() res: any) {
    return res.status(200).send(this.buildLoginHtml());
  }

  @Post('verify')
  verify(@Body('key') key: string) {
    this.checkKey(key);
    return { ok: true };
  }

  // ─── Datos del panel (JSON) ───────────────────────────────────────────────

  @Get('data')
  async data(@Headers('x-admin-key') key: string) {
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
    return { reports, bannedUsers };
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────

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

  private buildLoginHtml(): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Susurro Admin</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;background:#0d0d0d;color:#e0e0e0;min-height:100vh}

    #login{display:flex;flex-direction:column;align-items:center;justify-content:center;
           min-height:100vh;gap:16px;padding:24px}
    #login h1{font-size:26px;font-weight:300;font-style:italic;color:#fff}
    #login p{color:rgba(255,255,255,0.35);font-size:13px}
    .pw-wrap{position:relative;width:100%;max-width:320px}
    .pw-wrap input{width:100%;padding:14px 44px 14px 16px;background:rgba(255,255,255,0.07);
                   border:1px solid rgba(255,255,255,0.12);border-radius:12px;
                   color:#fff;font-size:15px;outline:none}
    .eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);
         background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);
         font-size:18px;line-height:1;padding:0}
    #login button.main{width:100%;max-width:320px;padding:14px;background:#fff;color:#080808;
                  border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer}
    #login .err{color:rgba(255,80,80,0.8);font-size:13px;display:none}

    #panel{display:none;padding:24px}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
    .logo{font-size:22px;font-weight:300;font-style:italic;color:#fff}
    .logout{color:rgba(255,255,255,0.3);font-size:13px;cursor:pointer;background:none;
            border:none;padding:4px}
    h2{font-size:12px;color:rgba(255,255,255,0.35);font-weight:600;text-transform:uppercase;
       letter-spacing:1px;margin:24px 0 12px}
    .badge{display:inline-block;background:rgba(255,255,255,0.1);border-radius:20px;
           padding:1px 8px;font-size:11px;margin-left:6px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:8px 12px;color:rgba(255,255,255,0.3);
       border-bottom:1px solid rgba(255,255,255,0.07);font-weight:500}
    td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top}
    tr:hover td{background:rgba(255,255,255,0.02)}
    .txt{max-width:260px;color:rgba(255,255,255,0.55)}
    button{font-size:12px;padding:5px 10px;border-radius:6px;border:none;cursor:pointer;
           margin:2px;background:rgba(255,255,255,0.1);color:#fff}
    button.danger{background:rgba(200,0,0,0.4)}
    .empty{color:rgba(255,255,255,0.2);font-size:13px;padding:12px 0}
    #toast{position:fixed;bottom:24px;right:24px;background:#222;color:#fff;
           padding:12px 20px;border-radius:10px;font-size:13px;display:none;
           border:1px solid rgba(255,255,255,0.1)}
  </style>
</head>
<body>

<div id="login">
  <h1>susurro</h1>
  <p>Panel de moderación</p>
  <div class="pw-wrap">
    <input id="keyInput" type="password" placeholder="Clave de administrador" />
    <button class="eye" id="eyeBtn" type="button">&#128065;</button>
  </div>
  <button class="main" id="loginBtn">Entrar</button>
  <span class="err" id="err">Clave incorrecta</span>
</div>

<div id="panel">
  <div class="top">
    <span class="logo">susurro <span style="font-style:normal;font-size:13px;color:rgba(255,255,255,0.3)">admin</span></span>
    <button class="logout" id="logoutBtn">Cerrar sesión</button>
  </div>
  <div id="content"></div>
</div>

<div id="toast"></div>

<script>
(function() {
  var API = '${BASE}';
  var KEY = '';

  // ─── Login ───────────────────────────────────────────────────────────────

  document.getElementById('eyeBtn').addEventListener('click', function() {
    var inp = document.getElementById('keyInput');
    var isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    this.innerHTML = isHidden ? '&#128064;' : '&#128065;';
  });

  document.getElementById('keyInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doLogin();
  });

  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  function doLogin() {
    var k = document.getElementById('keyInput').value.trim();
    if (!k) return;
    fetch(API + '/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: k }),
    }).then(function(r) {
      if (r.ok) {
        KEY = k;
        sessionStorage.setItem('adminKey', k);
        showPanel();
      } else {
        document.getElementById('err').style.display = 'block';
      }
    }).catch(function() {
      document.getElementById('err').style.display = 'block';
    });
  }

  function logout() {
    sessionStorage.removeItem('adminKey');
    KEY = '';
    document.getElementById('panel').style.display = 'none';
    document.getElementById('login').style.display = 'flex';
  }

  // ─── Panel ───────────────────────────────────────────────────────────────

  function showPanel() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('panel').style.display = 'block';
    document.getElementById('content').innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:13px">Cargando...</p>';
    fetch(API + '/admin/data', { headers: { 'x-admin-key': KEY } })
      .then(function(r) { return r.json(); })
      .then(function(d) { renderPanel(d.reports, d.bannedUsers); })
      .catch(function() {
        document.getElementById('content').innerHTML = '<p style="color:red">Error cargando datos</p>';
      });
  }

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderPanel(reports, bannedUsers) {
    var html = '';

    html += '<h2>Reportes pendientes <span class="badge">' + reports.length + '</span></h2>';
    if (reports.length === 0) {
      html += '<p class="empty">Sin reportes pendientes.</p>';
    } else {
      html += '<table><thead><tr><th>Reportado por</th><th>Razón</th><th>Contenido</th><th>Estado</th><th>Autor</th><th>Acciones</th></tr></thead><tbody>';
      for (var i = 0; i < reports.length; i++) {
        var rep = reports[i];
        var c = rep.confession;
        var content = c.audioUrl ? 'Nota de voz' : (c.text || '').slice(0, 120);
        html += '<tr>';
        html += '<td>' + esc(rep.user.alias) + '</td>';
        html += '<td>' + esc(rep.reason) + '</td>';
        html += '<td class="txt">' + esc(content) + '</td>';
        html += '<td>' + (c.hidden ? 'Oculta' : 'Visible') + '</td>';
        html += '<td>' + esc(c.user.alias) + (c.user.banned ? ' [B]' : '') + '</td>';
        html += '<td>';
        if (c.hidden) {
          html += '<button data-action="unhide" data-id="' + esc(c.id) + '">Mostrar</button>';
        } else {
          html += '<button class="danger" data-action="hide" data-id="' + esc(c.id) + '">Ocultar</button>';
        }
        if (!c.user.banned) {
          html += '<button class="danger" data-action="ban" data-uid="' + esc(c.user.id) + '">Banear usuario</button>';
        } else {
          html += '<button data-action="unban-user" data-uid="' + esc(c.user.id) + '">Desbanear</button>';
        }
        html += '<button data-action="resolve" data-id="' + esc(rep.id) + '">Resolver</button>';
        html += '</td></tr>';
      }
      html += '</tbody></table>';
    }

    html += '<h2>Usuarios baneados <span class="badge">' + bannedUsers.length + '</span></h2>';
    if (bannedUsers.length === 0) {
      html += '<p class="empty">Sin usuarios baneados.</p>';
    } else {
      html += '<table><thead><tr><th>Alias</th><th>Razón</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>';
      for (var j = 0; j < bannedUsers.length; j++) {
        var u = bannedUsers[j];
        html += '<tr><td>' + esc(u.alias) + '</td><td>' + esc(u.bannedReason || '') + '</td>';
        html += '<td>' + new Date(u.createdAt).toLocaleDateString('es') + '</td>';
        html += '<td><button data-action="unban-user" data-uid="' + esc(u.id) + '">Desbanear</button></td></tr>';
      }
      html += '</tbody></table>';
    }

    document.getElementById('content').innerHTML = html;
  }

  // Delegación de eventos — evita problemas con onclick inline
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    var id = btn.dataset.id;
    var uid = btn.dataset.uid;

    if (action === 'hide') {
      act('PATCH', '/admin/confessions/' + id + '/hide');
    } else if (action === 'unhide') {
      act('PATCH', '/admin/confessions/' + id + '/unhide');
    } else if (action === 'resolve') {
      act('PATCH', '/admin/reports/' + id + '/resolve');
    } else if (action === 'ban') {
      var reason = prompt('Razón del baneo:');
      if (reason) act('POST', '/admin/users/' + uid + '/ban', { reason: reason });
    } else if (action === 'unban-user') {
      act('POST', '/admin/users/' + uid + '/unban');
    }
  });

  function act(method, path, body) {
    fetch(API + path, {
      method: method,
      headers: { 'x-admin-key': KEY, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function(r) {
      if (r.ok) {
        toast('Listo');
        setTimeout(showPanel, 600);
      } else {
        return r.json().then(function(d) { toast('Error: ' + (d.message || r.status)); });
      }
    }).catch(function() { toast('Error de red'); });
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(function() { t.style.display = 'none'; }, 2000);
  }

  // Auto-login si hay clave en sesión
  var saved = sessionStorage.getItem('adminKey');
  if (saved) { KEY = saved; showPanel(); }
})();
</script>
</body>
</html>`;
  }
}
