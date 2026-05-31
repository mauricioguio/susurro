import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('search')
  search(@Query('q') q: string, @Request() req: any) {
    return this.service.search(q ?? '', req.user.sub);
  }

  @Get(':alias')
  profile(@Param('alias') alias: string, @Request() req: any) {
    return this.service.getProfile(alias, req.user.sub);
  }

  @Post(':alias/follow')
  follow(@Param('alias') alias: string, @Request() req: any) {
    return this.service.follow(req.user.sub, alias);
  }

  @Patch('me/bio')
  updateBio(@Request() req: any, @Body('bio') bio: string) {
    return this.service.updateBio(req.user.sub, bio);
  }
}
