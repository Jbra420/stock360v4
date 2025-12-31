import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private supabase: SupabaseService) {}

  async dashboard(userId: string) {
    if (!userId) {
      throw new BadRequestException('Falta userId en el request (req.user.id)');
    }

    const sb = this.supabase.admin();

const { data: lowStock } = await sb
  .from('productos_stock_bajo')
  .select('id,nombre,stock,stock_minimo')
  .limit(6);
    // OJO: en PostgREST es mejor sin espacios: productos(id,nombre,sku)
    const { data: movs, error: movErr } = await sb
      .from('movimientos')
      .select('id,tipo,cantidad,motivo,created_at,productos(id,nombre,sku)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (movErr) {
      console.error('SUPABASE movs ERROR >>>', movErr);
      throw new InternalServerErrorException('Error consultando movimientos');
    }

    // Inicio del día (mejor en UTC para evitar líos)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count: totalMovsHoy, error: countErr } = await sb
      .from('movimientos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString());

    if (countErr) {
      console.error('SUPABASE count ERROR >>>', countErr);
      throw new InternalServerErrorException('Error consultando resumen');
    }

    return {
      resumen: {
        movimientos_hoy: totalMovsHoy ?? 0,
      },
      movimientos_recientes: movs ?? [],
      alertas: {
        stock_bajo_count: lowStock?.length ?? 0,
        stock_bajo: lowStock ?? [],
      },
    };
  }
}