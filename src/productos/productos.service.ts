import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private supabase: SupabaseService) {}

  async findAll(params?: { search?: string; categoria_id?: string; active?: string }) {
    const search = params?.search?.trim();
    const categoria_id = params?.categoria_id?.trim();
    const active = params?.active?.trim(); // "true" | "false" | undefined

    let query = this.supabase
      .admin()
      .from('productos')
      .select('*, categorias ( id, nombre ), inventario ( stock_actual, stock_minimo, updated_at )');

    // filtros
    if (categoria_id) query = query.eq('categoria_id', categoria_id);
    if (active === 'true') query = query.eq('is_active', true);
    if (active === 'false') query = query.eq('is_active', false);

    // búsqueda simple
    if (search) {
      // busca por nombre o sku
      query = query.or(`nombre.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .admin()
      .from('productos')
      .select('*, categorias ( id, nombre ), inventario ( stock_actual, stock_minimo, updated_at )')
      .eq('id', id)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Crea producto y crea inventario automáticamente con stock_actual=0.
   * Si falla inventario, hacemos rollback borrando el producto.
   */
  async create(userId: string, dto: CreateProductoDto) {
    // 1) crear producto
    const { data: producto, error: prodErr } = await this.supabase
      .admin()
      .from('productos')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        sku: dto.sku,
        talla: dto.talla ?? null,
        color: dto.color ?? null,
        categoria_id: dto.categoria_id,
        created_by: userId,
        is_active: dto.is_active ?? true,
      })
      .select('*')
      .single();

    if (prodErr) throw new BadRequestException(prodErr.message);

    // 2) crear inventario (stock=0)
    const stockMin = dto.stock_minimo ?? 0;

    const { error: invErr } = await this.supabase
      .admin()
      .from('inventario')
      .insert({
        producto_id: producto.id,
        stock_actual: 0,
        stock_minimo: stockMin,
      });

    if (invErr) {
      // rollback: borrar producto creado
      await this.supabase.admin().from('productos').delete().eq('id', producto.id);
      throw new BadRequestException(`Producto creado pero inventario falló: ${invErr.message}`);
    }

    // 3) devolver producto completo con inventario
    return this.findOne(producto.id);
  }

  async update(id: string, dto: UpdateProductoDto) {
    // 1) actualizar producto
    const { data: updated, error } = await this.supabase
      .admin()
      .from('productos')
      .update({
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
        ...(dto.talla !== undefined ? { talla: dto.talla } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.categoria_id !== undefined ? { categoria_id: dto.categoria_id } : {}),
        ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    // 2) si vienen cambios de stock_minimo, actualizar inventario
    if (dto.stock_minimo !== undefined) {
      const { error: invErr } = await this.supabase
        .admin()
        .from('inventario')
        .update({ stock_minimo: dto.stock_minimo })
        .eq('producto_id', id);

      if (invErr) throw new BadRequestException(invErr.message);
    }

    return this.findOne(updated.id);
  }

  async remove(id: string) {
    // inventario se borra por cascade (inventario.producto_id references productos on delete cascade)
    const { error } = await this.supabase.admin().from('productos').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }
}