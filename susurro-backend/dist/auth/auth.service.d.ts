import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    register(email: string, password: string, alias: string): Promise<{
        token: string;
        alias: string;
        id: string;
    }>;
    login(email: string, password: string): Promise<{
        token: string;
        alias: string;
        id: string;
    }>;
}
