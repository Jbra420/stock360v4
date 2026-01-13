import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type Role = 'admin' | 'user';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  private buildEmailFromUsername(username: string) {
    return `${username}@stock360.local`;
  }

  async login(identifier: string, password: string) {
    const id = String(identifier ?? '').trim();
    const pass = String(password ?? '').trim();

    if (!id || !pass) {
      throw new BadRequestException('Faltan credenciales');
    }

    // Si viene username, lo convertimos al email interno usado al crear usuario
    const email = id.includes('@') ? id : this.buildEmailFromUsername(id);

    const sb = this.supabase.anon();

    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error || !data?.session || !data?.user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const userId = data.user.id;

    // Perfil desde profiles
    const { data: profile, error: profErr } = await this.supabase
      .admin()
      .from('profiles')
      .select('id, full_name, username, role, is_active, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (profErr) {
      // Si no hay profile, igual devolvemos lo mínimo
      return {
        token: data.session.access_token,
        user: { id: userId, email },
      };
    }

    return {
      token: data.session.access_token,
      user: {
        ...profile,
        email, // email real usado en auth
      },
    };
  }

  async me(userId: string) {
    if (!userId) throw new UnauthorizedException('Token inválido o userId faltante');

    // Traemos email real desde auth.users usando admin
    const { data: authData } = await this.supabase.admin().auth.admin.getUserById(userId);
    const email = authData?.user?.email ?? null;

    const { data, error } = await this.supabase
      .admin()
      .from('profiles')
      .select('id, full_name, username, role, is_active, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { user: { id: userId, email } };
    }

    return { user: { ...data, email } };
  }
}