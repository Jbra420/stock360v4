import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private supabase: SupabaseService) {}

  async dashboard() {
    // 1) Totales
    const [{ count: totalProductos, error: prodErr }, { count: totalCategorias, error: catErr }] =
      await Promise.all([
        this.supabase
          .admin()
          .from('productos')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        this.supabase
          .admin()
          .from('categorias')
          .select('id', { count: 'exact', head: true }),
      ]);

    if (prodErr) throw new BadRequestException(prodErr.message);
    if (catErr) throw new BadRequestException(catErr.message);

    // 2) Bajo stock (usa la vista que ya creamos: v_inventario_detalle)
    const { data: lowStock, error: lowErr } = await this.supabase
      .admin()
      .from('v_inventario_detalle')
      .select('producto_id, nombre, sku, talla, color, categoria_nombre, stock_actual, stock_minimo, bajo_stock')
      .eq('is_active', true)
      .eq('bajo_stock', true)
      .order('stock_actual', { ascending: true })
      .limit(20);

    if (lowErr) throw new BadRequestException(lowErr.message);

    // 3) Movimientos recientes
    const { data: movimientosRecientes, error: movErr } = await this.supabase
      .admin()
      .from('movimientos')
      .select(
        'id, tipo, cantidad, motivo, stock_previo, stock_resultante, created_at, ' +
          'productos ( id, nombre, sku, talla, color )'
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (movErr) throw new BadRequestException(movErr.message);

    // 4) Stock por categoría (agregado en backend)
    //    (más simple y estable que depender de GROUP BY en PostgREST)
    const { data: invData, error: invErr } = await this.supabase
      .admin()
      .from('v_inventario_detalle')
      .select('categoria_id, categoria_nombre, stock_actual')
      .eq('is_active', true);

    if (invErr) throw new BadRequestException(invErr.message);

    const stockPorCategoriaMap = new Map<string, { categoria_id: string; categoria_nombre: string; stock_total: number }>();

    for (const row of invData ?? []) {
      const key = row.categoria_id as string;
      const nombre = row.categoria_nombre as string;
      const stock = Number(row.stock_actual ?? 0);

      const current = stockPorCategoriaMap.get(key);
      if (!current) {
        stockPorCategoriaMap.set(key, { categoria_id: key, categoria_nombre: nombre, stock_total: stock });
      } else {
        current.stock_total += stock;
      }
    }

    const stockPorCategoria = Array.from(stockPorCategoriaMap.values()).sort(
      (a, b) => b.stock_total - a.stock_total
    );

    return {
      resumen: {
        total_productos: totalProductos ?? 0,
        total_categorias: totalCategorias ?? 0,
        productos_bajo_stock: lowStock?.length ?? 0,
      },
      low_stock: lowStock ?? [],
      movimientos_recientes: movimientosRecientes ?? [],
      stock_por_categoria: stockPorCategoria,
    };
  }
}