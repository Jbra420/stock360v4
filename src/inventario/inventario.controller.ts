import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('inventario')
@UseGuards(AuthGuard, RolesGuard)
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @Get()
  listar(
    @Query('search') search?: string,
    @Query('categoria') categoria?: string,
    @Query('categoria_id') categoriaId?: string,
  ) {
    const cat = categoriaId ?? categoria ?? undefined;
    return this.service.listar(search, cat);
  }

  @Post('movimientos')
  @Roles('admin', 'user')
  crearMovimiento(@Req() req: any, @Body() dto: CreateMovimientoDto) {
    return this.service.crearMovimiento(req.user.id, dto);
  }
}
