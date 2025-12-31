import { Module } from '@nestjs/common';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule], // ✅ IMPORTANTE
  controllers: [CategoriasController],
  providers: [CategoriasService],
})
export class CategoriasModule {}