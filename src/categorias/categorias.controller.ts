import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('categorias')
@UseGuards(AuthGuard, RolesGuard)
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  // Admin y User pueden ver
  @Get()
  findAll() {
    return this.categorias.findAll();
  }

  // Solo Admin crea
  @Post()
  @Roles('admin')
  create(@Req() req: any, @Body() dto: CreateCategoriaDto) {
    return this.categorias.create(req.user.id, dto);
  }

  // Solo Admin edita
  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
    return this.categorias.update(id, dto);
  }

  // Solo Admin elimina
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.categorias.remove(id);
  }
}