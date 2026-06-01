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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(alias, viewerId) {
        const user = await this.prisma.user.findUnique({
            where: { alias },
            select: {
                id: true, alias: true, bio: true, createdAt: true,
                _count: { select: { confessions: true, followers: true, following: true } },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        const isFollowing = viewerId ? await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
        }) : null;
        return { ...user, isFollowing: !!isFollowing };
    }
    async search(query, userId) {
        return this.prisma.user.findMany({
            where: { alias: { contains: query, mode: 'insensitive' }, NOT: { id: userId } },
            select: { alias: true, bio: true, _count: { select: { followers: true } } },
            take: 20,
        });
    }
    async follow(followerId, alias) {
        const target = await this.prisma.user.findUnique({ where: { alias } });
        if (!target)
            throw new common_1.NotFoundException();
        const exists = await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId: target.id } },
        });
        if (exists) {
            await this.prisma.follow.delete({ where: { id: exists.id } });
            return { following: false };
        }
        await this.prisma.follow.create({ data: { followerId, followingId: target.id } });
        return { following: true };
    }
    async updateBio(userId, bio) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { bio },
            select: { alias: true, bio: true },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map