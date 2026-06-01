import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(body: {
        email: string;
        password: string;
        alias: string;
    }): Promise<{
        token: string;
        alias: string;
        id: string;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        token: string;
        alias: string;
        id: string;
    }>;
}
