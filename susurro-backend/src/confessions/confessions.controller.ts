import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ConfessionsService } from './confessions.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('confessions')
@UseGuards(JwtGuard)
export class ConfessionsController {
  constructor(private readonly service: ConfessionsService) {}

  @Post()
  create(@Request() req: any, @Body('text') text: string) {
    return this.service.create(req.user.sub, text);
  }

  @Get('feed')
  feed(@Request() req: any, @Query('page') page?: string) {
    return this.service.getFeed(req.user.sub, page ? +page : 1);
  }

  @Get('explore')
  explore(@Request() req: any, @Query('page') page?: string) {
    return this.service.getExplore(req.user.sub, page ? +page : 1);
  }

  @Get('user/:alias')
  byUser(@Param('alias') alias: string, @Request() req: any, @Query('page') page?: string) {
    return this.service.getByUser(alias, req.user.sub, page ? +page : 1);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.service.delete(id, req.user.sub);
  }

  @Post(':id/react')
  react(@Param('id') id: string, @Request() req: any, @Body('type') type: string) {
    return this.service.react(id, req.user.sub, type);
  }

  @Get(':id/comments')
  comments(@Param('id') id: string) {
    return this.service.getComments(id);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Request() req: any, @Body('text') text: string) {
    return this.service.addComment(id, req.user.sub, text);
  }

  @Post(':id/report')
  report(@Param('id') id: string, @Request() req: any, @Body('reason') reason: string) {
    return this.service.report(id, req.user.sub, reason);
  }
}
