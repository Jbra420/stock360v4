import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class InventarioService {
  constructor(private supabase: SupabaseService) {}

  async list(search?: string, categoria_id?: string) {

    let q = this.supabase
      .admin()
      .from('inventario')
      .select(
        `
        producto_id,
        stock_actual,
        stock_minimo,
        updated_at,
        productos (
          id,
          nombre,
          sku,
          talla,
          color,
          categoria_id,
          is_active,
          created_at,
          updated_at,
          categorias ( id, nombre )
        )
      `,
      )
      .order('updated_at', { ascending: false });

    const s = (search ?? '').trim();
    if (s) {
      q = q.or(`nombre.ilike.%${s}%,sku.ilike.%${s}%`, { foreignTable: 'productos' });
    }

    const cat = (categoria_id ?? '').trim();
    if (cat && cat !== 'all') {
      q = q.eq('productos.categoria_id', cat);
    }

    const { data, error } = await q;

    if (error) {
      return { ok: false, total: 0, error: error.message, items: [] };
    }

    const items = (data ?? []).map((row: any) => {
      const p = row.productos ?? {};
      const categoriaNombre = p?.categorias?.nombre ?? 'Sin categoría';

      const stockActual = Number(row.stock_actual ?? 0);
      const stockMinimo = Number(row.stock_minimo ?? 0);

      return {
        producto_id: row.producto_id,
        nombre: p.nombre ?? '—',
        sku: p.sku ?? '—',
        talla: p.talla ?? '',
        color: p.color ?? '',
        categoria_id: p.categoria_id ?? null,
        categoria_nombre: categoriaNombre,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        bajo_stock: stockActual <= stockMinimo,
        es_activo: Boolean(p.is_active ?? true),
        creado_at: p.created_at ?? null,
        actualizado_at: row.updated_at ?? p.updated_at ?? null,

        id: row.producto_id,
        stock: stockActual,
        categoria: categoriaNombre,
      };
    });

    return {
      ok: true,
      total: items.length,
      items,
    };
  }
}