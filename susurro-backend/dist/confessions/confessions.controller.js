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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfessionsController = void 0;
const common_1 = require("@nestjs/common");
const confessions_service_1 = require("./confessions.service");
const jwt_guard_1 = require("../auth/jwt.guard");
let ConfessionsController = class ConfessionsController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(req, text) {
        return this.service.create(req.user.sub, text);
    }
    feed(req, page) {
        return this.service.getFeed(req.user.sub, page ? +page : 1);
    }
    explore(req, page) {
        return this.service.getExplore(req.user.sub, page ? +page : 1);
    }
    byUser(alias, req, page) {
        return this.service.getByUser(alias, req.user.sub, page ? +page : 1);
    }
    delete(id, req) {
        return this.service.delete(id, req.user.sub);
    }
    react(id, req, type) {
        return this.service.react(id, req.user.sub, type);
    }
    comments(id) {
        return this.service.getComments(id);
    }
    addComment(id, req, text) {
        return this.service.addComment(id, req.user.sub, text);
    }
    report(id, req, reason) {
        return this.service.report(id, req.user.sub, reason);
    }
};
exports.ConfessionsController = ConfessionsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('text')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('feed'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "feed", null);
__decorate([
    (0, common_1.Get)('explore'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "explore", null);
__decorate([
    (0, common_1.Get)('user/:alias'),
    __param(0, (0, common_1.Param)('alias')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "byUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/react'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "react", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "comments", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)('text')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Post)(':id/report'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], ConfessionsController.prototype, "report", null);
exports.ConfessionsController = ConfessionsController = __decorate([
    (0, common_1.Controller)('confessions'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:paramtypes", [confessions_service_1.ConfessionsService])
], ConfessionsController);
//# sourceMappingURL=confessions.controller.js.map