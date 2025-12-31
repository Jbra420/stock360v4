import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard'; // tu guard actual (JWT verify)

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
    return this.auth.me(req.user.id);
  }
}