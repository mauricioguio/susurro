import { UsersService } from './users.service';
export declare class UsersController {
    private readonly service;
    constructor(service: UsersService);
    search(q: string, req: any): Promise<{
        alias: string;
        bio: string | null;
        _count: {
            followers: number;
        };
    }[]>;
    profile(alias: string, req: any): Promise<{
        isFollowing: boolean;
        id: string;
        alias: string;
        bio: string | null;
        createdAt: Date;
        _count: {
            confessions: number;
            following: number;
            followers: number;
        };
    }>;
    follow(alias: string, req: any): Promise<{
        following: boolean;
    }>;
    updateBio(req: any, bio: string): Promise<{
        alias: string;
        bio: string | null;
    }>;
}
