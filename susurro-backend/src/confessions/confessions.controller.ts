import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConfessionsService } from './confessions.service';
import { JwtGuard } from '../auth/jwt.guard';
import { Public } from '../auth/public.decorator';

@Controller('confessions')
@UseGuards(JwtGuard)
export class ConfessionsController {
  constructor(private readonly service: ConfessionsService) {}

  @Public()
  @Post('upload-audio')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: './uploads/audio',
      filename: (_, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  uploadAudio(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/audio/${file.filename}` };
  }

  @Post()
  create(@Request() req: any, @Body() body: {
    text?: string;
    audioUrl?: string;
    tags?: string[];
    expiresAt?: string;
    pollQuestion?: string;
    parentId?: string;
  }) {
    return this.service.create(req.user.sub, body);
  }

  @Get('feed')
  feed(@Request() req: any, @Query('page') page?: string) {
    return this.service.getFeed(req.user.sub, page ? +page : 1);
  }

  @Get('explore')
  explore(@Request() req: any, @Query('page') page?: string, @Query('tag') tag?: string) {
    return this.service.getExplore(req.user.sub, page ? +page : 1, tag);
  }

  @Get('trending')
  trending(@Request() req: any, @Query('page') page?: string) {
    return this.service.getTrending(req.user.sub, page ? +page : 1);
  }

  @Get('bookmarks')
  bookmarks(@Request() req: any) {
    return this.service.getBookmarks(req.user.sub);
  }

  @Get('tags')
  popularTags() {
    return this.service.getTags();
  }

  @Get('search')
  search(@Query('q') q: string, @Request() req: any) {
    return this.service.search(req.user.sub, q ?? '');
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

  @Post(':id/bookmark')
  bookmark(@Param('id') id: string, @Request() req: any) {
    return this.service.toggleBookmark(id, req.user.sub);
  }

  @Post(':id/poll-vote')
  pollVote(@Param('id') id: string, @Request() req: any, @Body('vote') vote: boolean) {
    return this.service.votePoll(id, req.user.sub, vote);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: any) {
    return this.service.getById(id, req.user.sub);
  }

  @Get(':id/replies')
  replies(@Param('id') id: string, @Request() req: any) {
    return this.service.getReplies(id, req.user.sub);
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
