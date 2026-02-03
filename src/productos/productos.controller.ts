import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Controller('productos')
@UseGuards(AuthGuard, RolesGuard)
export class ProductosController {
  constructor(private readonly productos: ProductosService) {}

  // Admin y user: ver
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('q') q?: string, // ✅ compatibilidad con tu front (ProductosApiService usa "q")
    @Query('categoria_id') categoria_id?: string,
    @Query('active') active?: string,
  ) {
    const term = (search ?? q)?.toString();
    return this.productos.findAll({ search: term, categoria_id, active });
  }

  // Admin y user: ver uno
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productos.findOne(id);
  }

  // Solo admin: crear
  @Post()
  @Roles('admin')
  create(@Req() req: any, @Body() dto: CreateProductoDto) {
    throw new ForbiddenException(
      'La creación de productos está deshabilitada. Usa movimientos para crear productos.'
    );
  }

  // Solo admin: editar
  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    const body: any = dto as any;
    if (body?.stock_actual !== undefined || body?.stock_minimo !== undefined) {
      throw new ForbiddenException('El stock solo se modifica mediante movimientos.');
    }
    return this.productos.update(id, dto);
  }

  // Solo admin: eliminar
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    throw new ForbiddenException(
      'La eliminación de productos está deshabilitada. Usa movimientos para eliminar productos.'
    );
  }
}
