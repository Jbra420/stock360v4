import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AppRole } from './roles.decorator';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;

    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    if (!userId) throw new ForbiddenException('No autenticado');

    const { data, error } = await this.supabase
      .admin()
      .from('profiles')
      .select('role,is_active')
      .eq('id', userId)
      .single();

    if (error || !data || !data.is_active) {
      throw new ForbiddenException('Perfil no válido');
    }

    if (!required.includes(data.role as AppRole)) {
      throw new ForbiddenException('No tienes permisos');
    }

    // 👇 añade esto
    req.user.role = data.role;

    return true;
  }
}