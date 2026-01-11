import {
  Body,
  Controller,
  Delete,
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
    return this.productos.create(req.user.id, dto);
  }

  // Solo admin: editar
  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productos.update(id, dto);
  }

  // Solo admin: eliminar
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.productos.remove(id);
  }
}