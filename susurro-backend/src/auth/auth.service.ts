import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, alias: string) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { alias }] },
    });
    if (exists?.email === email) throw new ConflictException('El correo ya está registrado');
    if (exists?.alias === alias) throw new ConflictException('El alias ya está en uso');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hash, alias },
    });

    const token = this.jwt.sign({ sub: user.id, alias: user.alias });
    return { token, alias: user.alias, id: user.id };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    const token = this.jwt.sign({ sub: user.id, alias: user.alias });
    return { token, alias: user.alias, id: user.id };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Siempre responde OK para no revelar si el email existe
    if (!user) return { ok: true };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(code, 10);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.prisma.user.update({
      where: { email },
      data: { resetCode: hash, resetCodeExpiry: expiry },
    });

    await this.resend.emails.send({
      from: 'Susurro <noreply@susurro.app>',
      to: email,
      subject: 'Tu código para restablecer contraseña',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;background:#080808;color:#fff;padding:40px;border-radius:16px;">
          <h2 style="font-weight:300;font-style:italic;font-size:28px;margin-bottom:8px;">susurro</h2>
          <p style="color:rgba(255,255,255,0.5);margin-bottom:32px;">Tu código para restablecer tu contraseña:</p>
          <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:700;">${code}</div>
          <p style="color:rgba(255,255,255,0.3);font-size:13px;margin-top:24px;">Válido por 15 minutos. Si no solicitaste esto, ignora este mensaje.</p>
        </div>
      `,
    });

    return { ok: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.resetCode || !user?.resetCodeExpiry)
      throw new BadRequestException('Código inválido o expirado');

    if (new Date() > user.resetCodeExpiry)
      throw new BadRequestException('El código expiró. Solicita uno nuevo.');

    const valid = await bcrypt.compare(code, user.resetCode);
    if (!valid) throw new BadRequestException('Código incorrecto');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: { password: hash, resetCode: null, resetCodeExpiry: null },
    });

    return { ok: true };
  }
}
