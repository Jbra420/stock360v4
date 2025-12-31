import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { CategoriasModule } from './categorias/categorias.module';
import { AuthModule } from './auth/auth.module';
import { ProductosModule } from './productos/productos.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module';
import { InventarioModule } from './inventario/inventario.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    CategoriasModule,
    ProductosModule,
    MovimientosModule,
    AdminModule,
    UserModule,
    InventarioModule,
  ],
})
export class AppModule {}