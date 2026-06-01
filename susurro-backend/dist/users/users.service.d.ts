import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(alias: string, viewerId: string): Promise<{
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
    search(query: string, userId: string): Promise<{
        alias: string;
        bio: string | null;
        _count: {
            followers: number;
        };
    }[]>;
    follow(followerId: string, alias: string): Promise<{
        following: boolean;
    }>;
    updateBio(userId: string, bio: string): Promise<{
        alias: string;
        bio: string | null;
    }>;
}
