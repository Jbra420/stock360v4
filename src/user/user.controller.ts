import { Controller, Get, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard'; 

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get('dashboard')
  dashboard(@Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('No token / user missing');
    return this.userService.dashboard(req.user.id);
  }
}