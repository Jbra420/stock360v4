import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MovimientoBaseDto } from './dto/movimiento-base.dto';
import { AjusteDto } from './dto/ajuste.dto';


type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';
type AppRole = 'admin' | 'user';



@Injectable()
export class MovimientosService {
  constructor(private supabase: SupabaseService) {}

async registrarMovimiento(dto: any) {
  const { userId, producto_id, codigo, nombre, tipo, cantidad, motivo } = dto;

  if (!userId) throw new BadRequestException('Falta userId');
  if (!tipo) throw new BadRequestException('Falta tipo (ENTRADA | SALIDA | AJUSTE)');
  if (cantidad == null) throw new BadRequestException('Falta cantidad');

  let productoId: string | undefined = producto_id;

  if (!productoId && codigo) {
    const { data: prod, error } = await this.supabase
      .admin()
      .from('productos')
      .select('id')
      .eq('sku', String(codigo))
      .single();

    if (error || !prod) throw new BadRequestException('No existe producto con ese código (SKU)');
    productoId = String(prod.id);
  }

  if (!productoId && nombre) {
    const { data: prods, error } = await this.supabase
      .admin()
      .from('productos')
      .select('id, nombre, sku')
      .ilike('nombre', String(nombre))
      .limit(5);

    if (error) throw new BadRequestException(error.message);
    if (!prods || prods.length === 0) throw new BadRequestException('No existe producto con ese nombre');

    if (prods.length > 1) {
      throw new BadRequestException({
        message: 'Hay más de un producto con ese nombre. Usa producto_id o codigo(sku).',
        opciones: prods,
      });
    }

    productoId = String(prods[0].id);
  }

  if (!productoId) {
    throw new BadRequestException('Debes enviar producto_id o codigo(sku) o nombre');
  }

  return this.aplicarMovimiento(
    String(userId),
    String(productoId),
    tipo,
    Number(cantidad),
    motivo
  );
}

  async historial(opts: {
  requesterId: string;
  requesterRole: 'admin' | 'user';
  producto_id?: string;
  tipo?: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Number(opts.limit ?? 50), 200);
  const offset = Math.max(Number(opts.offset ?? 0), 0);

  let q = this.supabase
    .admin()
    .from('movimientos')
    .select(`
      id,
      producto_id,
      user_id,
      tipo,
      cantidad,
      motivo,
      stock_previo,
      stock_resultante,
      created_at,
      productos (
        id,
        nombre,
        sku
      ),
      profiles:user_id (
        id,
        full_name,
        username
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.requesterRole !== 'admin') {
    q = q.eq('user_id', opts.requesterId);
  }

  if (opts.producto_id) q = q.eq('producto_id', opts.producto_id);
  if (opts.tipo) q = q.eq('tipo', opts.tipo);
  if (opts.from) q = q.gte('created_at', opts.from);
  if (opts.to) q = q.lte('created_at', opts.to);

  const { data, error } = await q;
  if (error) throw new BadRequestException(error.message);

  return {
    limit,
    offset,
    count: data?.length ?? 0,
    data,
  };
}
  async entrada(userId: string, dto: MovimientoBaseDto) {
    return this.aplicarMovimiento(userId, dto.producto_id, 'ENTRADA', dto.cantidad, dto.motivo);
  }

  async salida(userId: string, dto: MovimientoBaseDto) {
    return this.aplicarMovimiento(userId, dto.producto_id, 'SALIDA', dto.cantidad, dto.motivo);
  }

  async ajuste(userId: string, dto: AjusteDto) {
    return this.aplicarMovimiento(userId, dto.producto_id, 'AJUSTE', dto.cantidad, dto.motivo);
  }

  private async aplicarMovimiento(
    userId: string,
    productoId: string,
    tipo: TipoMovimiento,
    cantidad: number,
    motivo?: string,
  ) {
    // 1) Leer inventario actual
    const { data: inv, error: invErr } = await this.supabase
      .admin()
      .from('inventario')
      .select('producto_id, stock_actual, stock_minimo')
      .eq('producto_id', productoId)
      .single();

    if (invErr || !inv) {
      throw new BadRequestException('No existe inventario para ese producto (¿producto inválido?)');
    }

    const stockPrevio = inv.stock_actual as number;

    // 2) Calcular nuevo stock
    let stockResultante = stockPrevio;

    if (tipo === 'ENTRADA') {
      if (cantidad <= 0) throw new BadRequestException('La cantidad debe ser > 0');
      stockResultante = stockPrevio + cantidad;
    }

    if (tipo === 'SALIDA') {
      if (cantidad <= 0) throw new BadRequestException('La cantidad debe ser > 0');
      if (stockPrevio < cantidad) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${stockPrevio}`);
      }
      stockResultante = stockPrevio - cantidad;
    }

    if (tipo === 'AJUSTE') {
      if (cantidad === 0) throw new BadRequestException('En ajuste, cantidad no puede ser 0');
      stockResultante = stockPrevio + cantidad; // cantidad puede ser - o +
      if (stockResultante < 0) {
        throw new BadRequestException(`El ajuste dejaría stock negativo. Disponible: ${stockPrevio}`);
      }
    }

    // 3) Actualizar inventario
    const { error: updErr } = await this.supabase
      .admin()
      .from('inventario')
      .update({ stock_actual: stockResultante })
      .eq('producto_id', productoId);

    if (updErr) throw new BadRequestException(updErr.message);

    // 4) Insertar movimiento (historial)
    const { data: mov, error: movErr } = await this.supabase
      .admin()
      .from('movimientos')
      .insert({
        producto_id: productoId,
        user_id: userId,
        tipo,
        cantidad,
        motivo: motivo ?? null,
        stock_previo: stockPrevio,
        stock_resultante: stockResultante,
      })
      .select('*')
      .single();

    if (movErr) {
      // rollback simple: intentar revertir inventario (best-effort)
      await this.supabase
        .admin()
        .from('inventario')
        .update({ stock_actual: stockPrevio })
        .eq('producto_id', productoId);

      throw new BadRequestException(`Movimiento falló: ${movErr.message}`);
    }

    return {
      movimiento: mov,
      inventario: {
        producto_id: productoId,
        stock_previo: stockPrevio,
        stock_resultante: stockResultante,
      },
    };
  }
}