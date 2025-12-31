import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('inventario')
@UseGuards(AuthGuard)
export class InventarioController {
  constructor(private readonly inv: InventarioService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('categoria') categoria?: string,
  ) {
    // req.user viene del AuthGuard
    return this.inv.list(search, categoria);
  }
}