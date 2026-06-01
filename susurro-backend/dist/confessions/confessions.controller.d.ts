import { ConfessionsService } from './confessions.service';
export declare class ConfessionsController {
    private readonly service;
    constructor(service: ConfessionsService);
    create(req: any, text: string): Promise<{
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
    feed(req: any, page?: string): Promise<({
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
    explore(req: any, page?: string): Promise<({
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
    byUser(alias: string, req: any, page?: string): Promise<({
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
    delete(id: string, req: any): Promise<{
        deleted: boolean;
    }>;
    react(id: string, req: any, type: string): Promise<{
        reacted: boolean;
    }>;
    comments(id: string): Promise<({
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
    addComment(id: string, req: any, text: string): Promise<{
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
    report(id: string, req: any, reason: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        confessionId: string;
        reason: string;
        resolved: boolean;
    }>;
}
