import { Body, Controller, Get, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: { identifier: string; password: string }) {
    return this.auth.login(body.identifier, body.password);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: any) {
    const userId = req?.user?.id;
    if (!userId) throw new UnauthorizedException('No token / user missing');
    return this.auth.me(userId);
  }
}