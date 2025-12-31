import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MovimientoBaseDto } from './dto/movimiento-base.dto';
import { AjusteDto } from './dto/ajuste.dto';

@Controller('movimientos')
@UseGuards(AuthGuard, RolesGuard)
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  // 🔹 Test rápido
  @Get('ping')
  ping() {
    return { ok: true };
  }

  // 🔹 Historial de movimientos
  @Get()
  @Roles('admin', 'user')
  historial(
    @Req() req: any,
    @Query('producto_id') producto_id?: string,
    @Query('tipo') tipo?: 'ENTRADA' | 'SALIDA' | 'AJUSTE',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.movimientos.historial({
      requesterId: req.user.id,
      requesterRole: req.user.role,
      producto_id,
      tipo,
      from,
      to,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    } as any);
  }

  // 🔹 Registro genérico (nombre / codigo / producto_id)
  @Post()
  @Roles('admin', 'user')
  registrar(@Req() req: any, @Body() body: any) {
    // El userId se toma del token
    return this.movimientos.registrarMovimiento({
      ...body,
      userId: req.user.id,
    });
  }

  // 🔹 Entrada directa
  @Post('entrada')
  @Roles('admin', 'user')
  entrada(@Req() req: any, @Body() dto: MovimientoBaseDto) {
    return this.movimientos.entrada(req.user.id, dto);
  }

  // 🔹 Salida directa
  @Post('salida')
  @Roles('admin', 'user')
  salida(@Req() req: any, @Body() dto: MovimientoBaseDto) {
    return this.movimientos.salida(req.user.id, dto);
  }

  // 🔹 Ajuste directo
  @Post('ajuste')
  @Roles('admin', 'user')
  ajuste(@Req() req: any, @Body() dto: AjusteDto) {
    return this.movimientos.ajuste(req.user.id, dto);
  }
}