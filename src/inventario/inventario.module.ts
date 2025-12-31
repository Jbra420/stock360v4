import { Module } from '@nestjs/common';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module'; // si tu AuthGuard está aquí
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [InventarioController],
  providers: [InventarioService, AuthGuard],
})
export class InventarioModule {}