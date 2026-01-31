import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';

@Injectable()
export class InventarioService {
  constructor(private supabase: SupabaseService) {}

  async listar(search?: string, categoriaId?: string) {
    const q = this.supabase
      .admin()
      .from('v_inventario_detalle')
      .select(
        'producto_id, nombre, sku, talla, color, categoria_id, categoria_nombre, stock_actual, stock_minimo, bajo_stock, updated_at',
        { count: 'exact' },
      )
      .eq('is_active', true);

    const searchTrim = String(search ?? '').trim();
    if (searchTrim) {
      q.or(`nombre.ilike.%${searchTrim}%,sku.ilike.%${searchTrim}%`);
    }

    const cat = String(categoriaId ?? '').trim();
    if (cat) {
      q.eq('categoria_id', cat);
    }

    const { data, error, count } = await q.order('nombre', { ascending: true });
    if (error) throw new BadRequestException(error.message);

    return { items: data ?? [], total: count ?? (data?.length ?? 0) };
  }

  private async assertRoleCanMoveStock(userId: string) {
    const { data: profile, error } = await this.supabase
      .admin()
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', userId)
      .single();

    if (error || !profile) throw new ForbiddenException('Perfil no encontrado');
    if (profile.is_active === false) throw new ForbiddenException('Usuario inactivo');

    const role = String(profile.role ?? '').toLowerCase();

    const allowed = new Set(['admin', 'operativo', 'empleado']);
    if (!allowed.has(role)) throw new ForbiddenException('No autorizado para mover inventario');
  }

  async crearMovimiento(userId: string, dto: CreateMovimientoDto) {
    await this.assertRoleCanMoveStock(userId);

    // 1) leer inventario actual del producto
    const { data: inv, error: invReadErr } = await this.supabase
      .admin()
      .from('inventario')
      .select('producto_id, stock_actual')
      .eq('producto_id', dto.producto_id)
      .single();

    if (invReadErr) throw new BadRequestException(invReadErr.message);

    const stockAnterior = Number(inv.stock_actual ?? 0);

    // 2) calcular stock nuevo
    let stockNuevo = stockAnterior;
    let cantidadRegistrada = 0;

    if (dto.tipo === 'ENTRADA') {
      const cant = Number(dto.cantidad ?? 0);
      if (!cant || cant < 1) throw new BadRequestException('cantidad requerida (>=1) para ENTRADA');
      stockNuevo = stockAnterior + cant;
      cantidadRegistrada = cant;
    }

    if (dto.tipo === 'SALIDA') {
      const cant = Number(dto.cantidad ?? 0);
      if (!cant || cant < 1) throw new BadRequestException('cantidad requerida (>=1) para SALIDA');
      if (cant > stockAnterior) throw new BadRequestException('Stock insuficiente para SALIDA');
      stockNuevo = stockAnterior - cant;
      cantidadRegistrada = cant;
    }

    if (dto.tipo === 'AJUSTE') {
      const nuevo = dto.nuevo_stock;
      if (nuevo === undefined || nuevo === null || Number.isNaN(Number(nuevo)))
        throw new BadRequestException('nuevo_stock requerido (>=0) para AJUSTE');
      if (Number(nuevo) < 0) throw new BadRequestException('nuevo_stock no puede ser negativo');

      stockNuevo = Number(nuevo);
      cantidadRegistrada = Math.abs(stockNuevo - stockAnterior);
      if (!dto.motivo?.trim()) {
        throw new BadRequestException('motivo es obligatorio para AJUSTE');
      }
    }

    // 3) actualizar inventario
    const { error: invUpdErr } = await this.supabase
      .admin()
      .from('inventario')
      .update({ stock_actual: stockNuevo, updated_at: new Date().toISOString() })
      .eq('producto_id', dto.producto_id);

    if (invUpdErr) throw new BadRequestException(invUpdErr.message);

    // 4) registrar movimiento
    const { data: mov, error: movErr } = await this.supabase
      .admin()
      .from('movimientos_inventario')
      .insert({
        producto_id: dto.producto_id,
        tipo: dto.tipo,
        cantidad: cantidadRegistrada,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: dto.motivo ?? null,
        referencia: dto.referencia ?? null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (movErr) throw new BadRequestException(movErr.message);

    return { ok: true, movimiento: mov, stock_anterior: stockAnterior, stock_nuevo: stockNuevo };
  }
}
