import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('inventario')
@UseGuards(AuthGuard, RolesGuard)
export class InventarioController {
  constructor(private readonly inv: InventarioService) {}

  @Get()
  @Roles('admin', 'user')
  list(
    @Query('search') search?: string,
    @Query('categoria_id') categoria_id?: string,
  ) {
    return this.inv.list(search, categoria_id);
  }
}