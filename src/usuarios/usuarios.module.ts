import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosPurgeService } from './usuarios-purge.service';

@Module({
  imports: [SupabaseModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, UsuariosPurgeService],
})
export class UsuariosModule {}
