import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('c')
export class WebController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async confessionPage(@Param('id') id: string, @Res() res: Response) {
    const confession = await this.prisma.confession.findUnique({
      where: { id },
      select: { text: true, audioUrl: true, tags: true, createdAt: true, hidden: true },
    });

    if (!confession || confession.hidden) {
      return res.status(404).send(this.htmlPage(
        'Susurro',
        'Esta confesión ya no está disponible.',
        '',
      ));
    }

    const title = confession.audioUrl ? '🎙️ Nota de voz anónima' : (confession.text?.slice(0, 80) ?? '');
    const description = confession.text
      ? (confession.text.length > 160 ? confession.text.slice(0, 157) + '…' : confession.text)
      : 'Una nota de voz anónima en Susurro';
    const tags = confession.tags?.join('  ') ?? '';

    return res.status(200).send(this.htmlPage(title, description, tags));
  }

  private htmlPage(title: string, description: string, tags: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Susurro — ${this.escape(title)}</title>
  <meta name="description" content="${this.escape(description)}" />
  <meta property="og:title" content="susurro 🤫" />
  <meta property="og:description" content="${this.escape(description)}" />
  <meta property="og:site_name" content="Susurro — confesiones anónimas" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="susurro 🤫" />
  <meta name="twitter:description" content="${this.escape(description)}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #080808; color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 24px;
    }
    .logo { font-size: 28px; font-weight: 300; font-style: italic;
            letter-spacing: -0.5px; margin-bottom: 32px; opacity: 0.9; }
    .card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px; padding: 28px; max-width: 480px; width: 100%; gap: 16px;
      display: flex; flex-direction: column;
    }
    .text { font-size: 18px; line-height: 1.7; color: rgba(255,255,255,0.85); }
    .audio { color: rgba(255,255,255,0.4); font-size: 16px; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag {
      font-size: 12px; color: rgba(255,255,255,0.4);
      background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 12px;
    }
    .cta {
      display: block; text-align: center; margin-top: 8px;
      background: #fff; color: #080808; font-weight: 600; font-size: 16px;
      padding: 16px; border-radius: 14px; text-decoration: none;
    }
    .sub { text-align: center; color: rgba(255,255,255,0.2); font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="logo">susurro</div>
  <div class="card">
    ${description === 'Esta confesión ya no está disponible.'
      ? `<p class="audio">${this.escape(description)}</p>`
      : `${title.includes('🎙️')
          ? `<p class="audio">🎙️ Nota de voz anónima</p>`
          : `<p class="text">"${this.escape(description)}"</p>`
        }
        ${tags ? `<div class="tags">${tags.split('  ').map(t => `<span class="tag">${this.escape(t)}</span>`).join('')}</div>` : ''}`
    }
  </div>
  <a class="cta" href="https://play.google.com/store/apps/details?id=com.susurroapp">
    Descargar Susurro
  </a>
  <p class="sub">confesiones anónimas · lo que dices, desaparece</p>
</body>
</html>`;
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
