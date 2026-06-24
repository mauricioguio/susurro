import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Req() req: any) {
    return this.messagesService.getConversations(req.user.sub);
  }

  @Post('conversations')
  startConversation(@Req() req: any, @Body() body: { alias: string }) {
    return this.messagesService.getOrCreateConversation(req.user.sub, body.alias);
  }

  @Get('conversations/:id')
  getMessages(@Req() req: any, @Param('id') conversationId: string) {
    return this.messagesService.getMessages(req.user.sub, conversationId);
  }
}
