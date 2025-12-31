import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .admin()
      .from('categorias')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async create(userId: string, dto: CreateCategoriaDto) {
    const { data, error } = await this.supabase
      .admin()
      .from('categorias')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, dto: UpdateCategoriaDto) {
    const { data, error } = await this.supabase
      .admin()
      .from('categorias')
      .update({
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .admin()
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }
}