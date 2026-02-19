import { Body, Controller, Get, Post, Req, UseGuards, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @Post('login')
  async login(@Body() body: { identifier: string; password: string }) {
    try {
      return await this.auth.login(body.identifier, body.password);
    } catch (err: any) {
      // Re-lanzar excepciones NestJS (401, 400) tal cual
      if (err?.status) throw err;
      // Para errores inesperados (Supabase network, etc.) loggear y devolver 500
      console.error('[AUTH] Error inesperado en login:', err?.message ?? err);
      throw new InternalServerErrorException('Error interno al autenticar');
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: any) {
    const userId = req?.user?.id;
    if (!userId) throw new UnauthorizedException('No token / user missing');
    return this.auth.me(userId);
  }
}