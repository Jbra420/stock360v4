import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

@Injectable()
export class MovimientosService {
  constructor(private supabase: SupabaseService) {}

  async registrarMovimiento(dto: any) {
    const {
      userId,
      producto_id,
      codigo,
      sku,
      nombre,
      tipo,
      cantidad,
      motivo,
      categoria_id: categoriaIdRaw,
      categoriaId,
      categoria,
      categoria_nombre,
      categoriaName,
      descripcion,
      talla,
      color,
      stock_minimo,
      eliminar_producto,
      uid, // <--- 1. NUEVO: Recibimos el UID del RFID
    } = dto;

    if (!userId) throw new BadRequestException('Falta userId');
    if (!tipo) throw new BadRequestException('Falta tipo (ENTRADA | SALIDA | AJUSTE)');
    if (cantidad == null) throw new BadRequestException('Falta cantidad');

    let productoId: string | undefined = producto_id;
    let productoWasInactive = false;
    let skuInput = codigo ?? sku;
    let categoria_id: string | undefined = categoriaIdRaw ?? categoriaId;
    let esProductoNuevo = false; // <--- Flag para saber si necesitamos actualizar luego
    const uidValue = uid ? String(uid) : undefined;
    const isMissingColumnError = (message: string, column: string) => {
      const msg = message.toLowerCase();
      return msg.includes('column') && msg.includes(column.toLowerCase());
    };
    const missingUidColumnsMessage =
      'No existen columnas uid ni codigo_rfid en productos. Agrega una o envíame el nombre real de la columna.';

    // ------------------------------------------------------------------
    // BLOQUE 1: Intentar buscar Categoría por nombre si no hay ID
    // ------------------------------------------------------------------
    if (!categoria_id) {
      const categoriaNombre = categoria ?? categoria_nombre ?? categoriaName;
      if (categoriaNombre) {
        const { data: cats, error } = await this.supabase
          .admin()
          .from('categorias')
          .select('id, nombre')
          .ilike('nombre', String(categoriaNombre))
          .limit(5);

        if (error) throw new BadRequestException(error.message);
        if (cats && cats.length === 1) {
          categoria_id = String(cats[0].id);
        } else if (cats && cats.length > 1) {
          throw new BadRequestException({
            message: 'Hay más de una categoría con ese nombre. Usa categoria_id.',
            opciones: cats,
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // BLOQUE 2: Buscar Producto existente (Por ID, SKU o Nombre)
    // ------------------------------------------------------------------
    
    // A) Por ID
    if (productoId) {
      const { data: prod, error } = await this.supabase
        .admin()
        .from('productos')
        .select('id, is_active')
        .eq('id', String(productoId))
        .single();

      if (error || !prod) throw new BadRequestException('No existe producto con ese id');
      productoWasInactive = prod.is_active === false;
    }

    // B) Por UID (uid o codigo_rfid)
    if (!productoId && uidValue) {
      const tryByColumn = async (column: 'uid' | 'codigo_rfid') => {
        return this.supabase
          .admin()
          .from('productos')
          .select(`id, ${column}, is_active`)
          .eq(column, uidValue)
          .limit(5);
      };

      let prods: any[] | null = null;
      let error: any | null = null;

      ({ data: prods, error } = await tryByColumn('uid'));

      if (error) {
        const msg = String(error.message ?? '');
        if (isMissingColumnError(msg, 'uid')) {
          ({ data: prods, error } = await tryByColumn('codigo_rfid'));
        } else {
          throw new BadRequestException(error.message);
        }
      }

      if (!error && (!prods || prods.length === 0)) {
        const res = await tryByColumn('codigo_rfid');
        if (res.error) {
          const msg = String(res.error.message ?? '');
          if (!isMissingColumnError(msg, 'codigo_rfid')) {
            throw new BadRequestException(res.error.message);
          }
        } else {
          prods = res.data;
        }
      }

      if (!prods || prods.length === 0) {
        productoId = undefined;
      } else {
        if (prods.length > 1) {
          throw new BadRequestException({
            message: 'Hay más de un producto con ese UID. Usa producto_id.',
            opciones: prods,
          });
        }
        productoId = String(prods[0].id);
        productoWasInactive = prods[0].is_active === false;
      }
    }

    // C) Por SKU
    if (!productoId && skuInput) {
      const { data: prod, error } = await this.supabase
        .admin()
        .from('productos')
        .select('id, is_active')
        .eq('sku', String(skuInput))
        .single();

      if (error || !prod) {
        productoId = undefined;
      } else {
        productoId = String(prod.id);
        productoWasInactive = prod.is_active === false;
      }
    }

    // D) Por Nombre
    if (!productoId && nombre) {
      const { data: prods, error } = await this.supabase
        .admin()
        .from('productos')
        .select('id, nombre, sku, is_active')
        .ilike('nombre', String(nombre))
        .limit(5);

      if (error) throw new BadRequestException(error.message);
      if (!prods || prods.length === 0) {
        productoId = undefined;
      } else {
        if (prods.length > 1) {
          throw new BadRequestException({
            message: 'Hay más de un producto con ese nombre. Usa producto_id.',
            opciones: prods,
          });
        }
        productoId = String(prods[0].id);
        productoWasInactive = prods[0].is_active === false;
      }
    }

    // ------------------------------------------------------------------
    // BLOQUE 3: Si NO existe, CREAR el producto
    // ------------------------------------------------------------------
    if (!productoId) {
      if (!nombre || !categoria_id) {
        throw new BadRequestException(
          'Producto no encontrado. Para crearlo debes enviar nombre y categoria_id'
        );
      }

      const insertProducto: Record<string, string | null | boolean> = {
        nombre: String(nombre),
        descripcion: descripcion ?? null,
        talla: talla ?? null,
        color: color ?? null,
        categoria_id: String(categoria_id),
        created_by: String(userId),
        is_active: true,
        uid: uidValue ?? null, // <--- 2. NUEVO: Si es nuevo, insertamos el UID aquí
      };
      
      if (skuInput) {
        insertProducto.sku = String(skuInput);
      }

      let producto: any | null = null;
      let prodErr: any | null = null;

      ({ data: producto, error: prodErr } = await this.supabase
        .admin()
        .from('productos')
        .insert(insertProducto)
        .select('id')
        .single());

      if (prodErr && uidValue) {
        const msg = String(prodErr.message ?? '');
        if (isMissingColumnError(msg, 'uid')) {
          const insertAlt = { ...insertProducto };
          delete insertAlt.uid;
          insertAlt.codigo_rfid = uidValue;
          ({ data: producto, error: prodErr } = await this.supabase
            .admin()
            .from('productos')
            .insert(insertAlt)
            .select('id')
            .single());
          if (prodErr) {
            const altMsg = String(prodErr.message ?? '');
            if (isMissingColumnError(altMsg, 'codigo_rfid')) {
              throw new BadRequestException(missingUidColumnsMessage);
            }
          }
        }
      }

      if (prodErr || !producto) {
        throw new BadRequestException(`No se pudo crear el producto: ${prodErr?.message ?? 'desconocido'}`);
      }

      // Crear inventario inicial en 0
      const stockMin = Number(stock_minimo ?? 0);
      const { error: invErr } = await this.supabase
        .admin()
        .from('inventario')
        .insert({
          producto_id: producto.id,
          stock_actual: 0,
          stock_minimo: Number.isFinite(stockMin) ? stockMin : 0,
        });

      if (invErr) {
        await this.supabase.admin().from('productos').delete().eq('id', producto.id);
        throw new BadRequestException(`Producto creado pero inventario falló: ${invErr.message}`);
      }

      productoId = String(producto.id);
      esProductoNuevo = true;
    } 
    // ------------------------------------------------------------------
    // BLOQUE 4: Si YA existía y viene UID, actualizar el producto
    // ------------------------------------------------------------------
    else if (uidValue && !esProductoNuevo) { 
      // <--- 3. NUEVO: Si el producto ya existía y nos mandan un UID, lo actualizamos (vinculamos el tag)
      const { error: updErr } = await this.supabase
        .admin()
        .from('productos')
        .update({ uid: uidValue })
        .eq('id', productoId);

      if (updErr) {
        const msg = String(updErr.message ?? '');
        if (isMissingColumnError(msg, 'uid')) {
          const { error: updAltErr } = await this.supabase
            .admin()
            .from('productos')
            .update({ codigo_rfid: uidValue })
            .eq('id', productoId);
          if (updAltErr) {
            const altMsg = String(updAltErr.message ?? '');
            if (isMissingColumnError(altMsg, 'codigo_rfid')) {
              throw new BadRequestException(missingUidColumnsMessage);
            }
            throw new BadRequestException(updAltErr.message);
          }
        } else {
          throw new BadRequestException(updErr.message);
        }
      }
    }

    // ------------------------------------------------------------------
    // FINAL: Aplicar el movimiento de stock
    // ------------------------------------------------------------------
    return this.aplicarMovimiento(
      String(userId),
      String(productoId),
      tipo,
      Number(cantidad),
      motivo,
      {
        eliminarProducto: Boolean(eliminar_producto),
        activarSiStockPositivo: productoWasInactive,
      }
    );
  }

  // ... (El resto de métodos: historial, aplicarMovimiento siguen igual) ...
  
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

  private async aplicarMovimiento(
    userId: string,
    productoId: string,
    tipo: TipoMovimiento,
    cantidad: number,
    motivo?: string,
    opts?: { eliminarProducto?: boolean; activarSiStockPositivo?: boolean },
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
  
    if (opts?.activarSiStockPositivo && stockResultante > 0) {
      const { error: actErr } = await this.supabase
        .admin()
        .from('productos')
        .update({ is_active: true })
        .eq('id', productoId);
  
      if (actErr) throw new BadRequestException(actErr.message);
    }
  
    if (opts?.eliminarProducto) {
      if (stockResultante !== 0) {
        throw new BadRequestException('Para eliminar producto, el stock debe quedar en 0');
      }
  
      const { error: delErr } = await this.supabase
        .admin()
        .from('productos')
        .update({ is_active: false })
        .eq('id', productoId);
  
      if (delErr) throw new BadRequestException(delErr.message);
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
