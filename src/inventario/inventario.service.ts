import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class InventarioService {
  constructor(private supabase: SupabaseService) {}

  async list(search?: string, categoria?: string) {
    let q = this.supabase
      .admin()
      .from('productos')
      .select(`
        id,
        nombre,
        sku,
        rfid,
        stock,
        precio,
        categoria_id,
        categorias ( id, nombre )
      `)
      .order('nombre', { ascending: true });

    if (search && search.trim()) {
      const s = search.trim();
      // busca por nombre, sku o rfid
      q = q.or(`nombre.ilike.%${s}%,sku.ilike.%${s}%,rfid.ilike.%${s}%`);
    }

    if (categoria && categoria !== 'all') {
      q = q.eq('categoria_id', categoria);
    }

    const { data, error } = await q;

    if (error) {
      return { ok: false, error: error.message, items: [] };
    }

    return {
      ok: true,
      items: (data ?? []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        sku: p.sku,
        rfid: p.rfid,
        stock: p.stock,
        precio: p.precio,
        categoria: p.categorias?.nombre ?? 'Sin categoría',
      })),
    };
  }
}