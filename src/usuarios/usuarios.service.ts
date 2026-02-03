import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type Rol = 'admin' | 'user';

@Injectable()
export class UsuariosService {
  constructor(private readonly supabase: SupabaseService) {}

  private isForeignKeyError(message?: string) {
    return /foreign key|violat/i.test(message ?? '');
  }

  private buildEmailFromUsername(username: string) {
    // Supabase Auth requiere email si estás usando Email provider.
    // Dominio interno para cuentas del sistema:
    return `${username}@stock360.local`;
  }

  async list(q?: string) {
    const sb = this.supabase.admin();

    let query = sb
      .from('profiles')
      .select('id, full_name, username, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    const term = (q ?? '').trim();
    if (term) {
      query = query.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    return data ?? [];
  }

  async create(input: { username: string; password: string; full_name: string; role: Rol }) {
    const sb = this.supabase.admin();

    // 1) crear en auth.users
    const email = this.buildEmailFromUsername(input.username);

    const { data: created, error: authErr } = await sb.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      app_metadata: { role: input.role },
      user_metadata: { username: input.username, full_name: input.full_name },
    });

    if (authErr) throw new BadRequestException(authErr.message);
    const userId = created.user?.id;
    if (!userId) throw new BadRequestException('No se pudo obtener el id del usuario creado');

    // 2) insertar profile
    const { error: profErr } = await sb.from('profiles').insert({
      id: userId,
      username: input.username,
      full_name: input.full_name,
      role: input.role,
      is_active: true,
    });

    if (profErr) {
      // rollback: borrar user creado en auth
      await sb.auth.admin.deleteUser(userId);
      throw new BadRequestException(`Usuario creado en auth pero profiles falló: ${profErr.message}`);
    }

    return {
      ok: true,
      user: { id: userId, username: input.username, full_name: input.full_name, role: input.role, is_active: true },
    };
  }

  async update(
    id: string,
    changes: {
      full_name?: string;
      username?: string;
      role?: Rol;
      is_active?: boolean;
      password?: string;
    },
  ) {
    const sb = this.supabase.admin();

    // 1) actualizar profiles
    const profileUpdate: any = {};
    if (changes.full_name !== undefined) profileUpdate.full_name = changes.full_name;
    if (changes.username !== undefined) profileUpdate.username = changes.username;
    if (changes.role !== undefined) profileUpdate.role = changes.role;
    if (changes.is_active !== undefined) profileUpdate.is_active = changes.is_active;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profErr } = await sb.from('profiles').update(profileUpdate).eq('id', id);
      if (profErr) throw new BadRequestException(profErr.message);
    }

    // 2) si viene password, actualizar auth.users
    if (changes.password) {
      const { error: passErr } = await sb.auth.admin.updateUserById(id, {
        password: changes.password,
      });
      if (passErr) throw new BadRequestException(passErr.message);
    }

    // 3) si cambia role, actualizar app_metadata (para que el JWT/guards lo vean)
    if (changes.role) {
      const { error: roleErr } = await sb.auth.admin.updateUserById(id, {
        app_metadata: { role: changes.role },
      });
      if (roleErr) throw new BadRequestException(roleErr.message);
    }

    // devolver el profile actualizado
    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name, username, role, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw new BadRequestException(error.message);

    return { ok: true, user: data };
  }

  async remove(id: string) {
    const sb = this.supabase.admin();

    // borrar profile primero
    const { error: profErr } = await sb.from('profiles').delete().eq('id', id);
    if (profErr) {
      const msg = profErr.message ?? '';
      const isFk = this.isForeignKeyError(msg);
      if (isFk) {
        // si tiene referencias, desactivar en lugar de borrar
        const { error: softErr } = await sb.from('profiles').update({ is_active: false }).eq('id', id);
        if (softErr) throw new BadRequestException(softErr.message);
        return { ok: true, deleted: false, inactive: true, reason: 'has-related-records' };
      }
      throw new BadRequestException(msg);
    }

    // borrar auth user (solo si el profile se borró)
    const { error: authErr } = await sb.auth.admin.deleteUser(id);
    if (authErr) throw new BadRequestException(authErr.message);

    return { ok: true, deleted: true };
  }

  async purgeInactive(days = 30) {
    const sb = this.supabase.admin();
    const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 30;
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: candidates, error: listErr } = await sb
      .from('profiles')
      .select('id, updated_at, created_at')
      .eq('is_active', false)
      .or(`updated_at.lt.${cutoff},and(updated_at.is.null,created_at.lt.${cutoff})`);

    if (listErr) throw new BadRequestException(listErr.message);

    const ids = (candidates ?? []).map((c: any) => c.id).filter(Boolean);
    if (ids.length === 0) {
      return { ok: true, days: safeDays, total: 0, deleted: 0, skipped_fk: 0, failed: 0 };
    }

    let deleted = 0;
    let skippedFk = 0;
    let failed = 0;
    const failures: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      const { error: profErr } = await sb.from('profiles').delete().eq('id', id);
      if (profErr) {
        if (this.isForeignKeyError(profErr.message)) {
          skippedFk++;
          continue;
        }
        failed++;
        failures.push({ id, reason: profErr.message ?? 'profile-delete-failed' });
        continue;
      }

      const { error: authErr } = await sb.auth.admin.deleteUser(id);
      if (authErr) {
        failed++;
        failures.push({ id, reason: authErr.message ?? 'auth-delete-failed' });
        continue;
      }

      deleted++;
    }

    return {
      ok: true,
      days: safeDays,
      total: ids.length,
      deleted,
      skipped_fk: skippedFk,
      failed,
      failures,
    };
  }
}
