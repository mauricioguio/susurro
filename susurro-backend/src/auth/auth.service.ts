import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
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
}
