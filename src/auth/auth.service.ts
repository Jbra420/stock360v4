import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  me(id: any) {
    throw new Error('Method not implemented.');
  }
  private supabaseAnon;

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService, // service role (para leer profiles)
  ) {
    const url = this.config.get<string>('SUPABASE_URL')!;
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY')!;

    // Cliente anon: sirve para auth (email/password) como lo haría el frontend
    this.supabaseAnon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }

  async login(identifier: string, password: string) {
  if (!identifier || !password) {
    throw new BadRequestException('Usuario y contraseña son obligatorios');
  }

  // 1) Determinar email (si viene email, se usa; si viene username, se busca en profiles)
  let email = identifier.trim();

  const looksLikeEmail = email.includes('@');

  if (!looksLikeEmail) {
    const username = email.toLowerCase();

    const { data: prof, error: profErr } = await this.supabase
      .admin()
      .from('profiles')
      .select('id, username')
      .ilike('username', username)
      .single();

    if (profErr || !prof) {
      throw new UnauthorizedException('Usuario o contraseña inválidos');
    }

    // buscar el email real en Auth desde el id del perfil (id = auth.users.id)
    const { data: userAuth, error: userErr } = await this.supabase
      .admin()
      .auth
      .admin
      .getUserById(prof.id);

    if (userErr || !userAuth?.user?.email) {
      throw new UnauthorizedException('Usuario o contraseña inválidos');
    }

    email = userAuth.user.email;
  }

  // 2) Login normal con email/password
  const { data, error } = await this.supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.session?.access_token || !data.user?.id) {
    throw new UnauthorizedException('Usuario o contraseña inválidos');
  }

  // 3) Sacar perfil y rol
  const { data: profile, error: profErr2 } = await this.supabase
    .admin()
    .from('profiles')
    .select('id, full_name, role, is_active, username')
    .eq('id', data.user.id)
    .single();

  if (profErr2 || !profile) throw new UnauthorizedException('No existe perfil para este usuario');
  if (!profile.is_active) throw new UnauthorizedException('Usuario inactivo');

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      email: data.user.email,
      username: profile.username, // opcional para mostrar en UI
    },
  };
}
}