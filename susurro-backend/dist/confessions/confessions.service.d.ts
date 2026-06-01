import { PrismaService } from '../prisma/prisma.service';
export declare class ConfessionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, text: string): Promise<{
        user: {
            alias: string;
        };
        _count: {
            comments: number;
            reactions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        userId: string;
    }>;
    getFeed(userId: string, page?: number): Promise<({
        user: {
            alias: string;
        };
        reactions: {
            type: string;
        }[];
        _count: {
            comments: number;
            reactions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        userId: string;
    })[]>;
    getExplore(userId: string, page?: number): Promise<({
        user: {
            alias: string;
        };
        reactions: {
            type: string;
        }[];
        _count: {
            comments: number;
            reactions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        userId: string;
    })[]>;
    getByUser(alias: string, userId: string, page?: number): Promise<({
        reactions: {
            type: string;
        }[];
        _count: {
            comments: number;
            reactions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        userId: string;
    })[]>;
    delete(id: string, userId: string): Promise<{
        deleted: boolean;
    }>;
    react(confessionId: string, userId: string, type: string): Promise<{
        reacted: boolean;
    }>;
    getComments(confessionId: string): Promise<({
        user: {
            alias: string;
        };
    } & {
        id: string;
        createdAt: Date;
        text: string;
        userId: string;
        confessionId: string;
    })[]>;
    addComment(confessionId: string, userId: string, text: string): Promise<{
        user: {
            alias: string;
        };
    } & {
        id: string;
        createdAt: Date;
        text: string;
        userId: string;
        confessionId: string;
    }>;
    report(confessionId: string, userId: string, reason: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        confessionId: string;
        reason: string;
        resolved: boolean;
    }>;
}
