"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfessionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ConfessionsService = class ConfessionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, text) {
        return this.prisma.confession.create({
            data: { userId, text },
            include: { user: { select: { alias: true } }, _count: { select: { reactions: true, comments: true } } },
        });
    }
    async getFeed(userId, page = 1) {
        const take = 20;
        const skip = (page - 1) * take;
        const following = await this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const ids = [userId, ...following.map(f => f.followingId)];
        return this.prisma.confession.findMany({
            where: { userId: { in: ids } },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
            include: {
                user: { select: { alias: true } },
                _count: { select: { reactions: true, comments: true } },
                reactions: { where: { userId }, select: { type: true } },
            },
        });
    }
    async getExplore(userId, page = 1) {
        const take = 20;
        const skip = (page - 1) * take;
        return this.prisma.confession.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            skip,
            include: {
                user: { select: { alias: true } },
                _count: { select: { reactions: true, comments: true } },
                reactions: { where: { userId }, select: { type: true } },
            },
        });
    }
    async getByUser(alias, userId, page = 1) {
        const take = 20;
        const skip = (page - 1) * take;
        const user = await this.prisma.user.findUnique({ where: { alias } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return this.prisma.confession.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
            include: {
                _count: { select: { reactions: true, comments: true } },
                reactions: { where: { userId }, select: { type: true } },
            },
        });
    }
    async delete(id, userId) {
        const confession = await this.prisma.confession.findUnique({ where: { id } });
        if (!confession)
            throw new common_1.NotFoundException();
        if (confession.userId !== userId)
            throw new common_1.ForbiddenException();
        await this.prisma.confession.delete({ where: { id } });
        return { deleted: true };
    }
    async react(confessionId, userId, type) {
        const exists = await this.prisma.reaction.findUnique({
            where: { userId_confessionId_type: { userId, confessionId, type } },
        });
        if (exists) {
            await this.prisma.reaction.delete({ where: { id: exists.id } });
            return { reacted: false };
        }
        await this.prisma.reaction.create({ data: { userId, confessionId, type } });
        return { reacted: true };
    }
    async getComments(confessionId) {
        return this.prisma.comment.findMany({
            where: { confessionId },
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { alias: true } } },
        });
    }
    async addComment(confessionId, userId, text) {
        return this.prisma.comment.create({
            data: { confessionId, userId, text },
            include: { user: { select: { alias: true } } },
        });
    }
    async report(confessionId, userId, reason) {
        return this.prisma.report.upsert({
            where: { userId_confessionId: { userId, confessionId } },
            update: { reason },
            create: { userId, confessionId, reason },
        });
    }
};
exports.ConfessionsService = ConfessionsService;
exports.ConfessionsService = ConfessionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConfessionsService);
//# sourceMappingURL=confessions.service.js.map