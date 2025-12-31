import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();

    const authHeader = req.headers['authorization'] as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta token Bearer');
    }

    const token = authHeader.slice('Bearer '.length).trim();

    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Falta SUPABASE_JWT_SECRET en el backend');
    }

    const key = new TextEncoder().encode(secret);

    try {
      const { payload } = await jwtVerify(token, key);

      const id = payload.sub; // supabase user id
      if (!id) {
        throw new UnauthorizedException('Token sin sub (user id)');
      }

      // email puede venir o no
      const email = (payload as any).email ?? null;

      // role puede venir en distintos lugares (depende cómo lo generes/guardes)
      const role =
        (payload as any).role ??
        (payload as any).user_metadata?.role ??
        (payload as any).app_metadata?.role ??
        null;

      req.user = { id, email, role, payload }; // payload opcional para debug

      return true;
    } catch (e) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}