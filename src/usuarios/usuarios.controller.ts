import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

type Rol = 'admin' | 'user';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  async list(@Query('q') q?: string) {
    return this.usuarios.list(q);
  }

  @Post()
  async create(@Body() body: any) {
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '').trim();
    const full_name = String(body.full_name ?? '').trim();
    const role = String(body.role ?? '').trim() as Rol;

    if (!username || !password || !full_name || !role) {
      throw new BadRequestException('Faltan campos: username, password, full_name, role');
    }
    if (!['admin', 'user'].includes(role)) {
      throw new BadRequestException("role debe ser 'admin' o 'user'");
    }

    return this.usuarios.create({ username, password, full_name, role });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const changes: any = {};

    if (body.full_name !== undefined) changes.full_name = String(body.full_name).trim();
    if (body.username !== undefined) changes.username = String(body.username).trim();
    if (body.role !== undefined) changes.role = String(body.role).trim() as Rol;
    if (body.is_active !== undefined) changes.is_active = !!body.is_active;
    if (body.password !== undefined) changes.password = String(body.password).trim();

    if (changes.role && !['admin', 'user'].includes(changes.role)) {
      throw new BadRequestException("role debe ser 'admin' o 'user'");
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('No hay cambios para actualizar');
    }

    return this.usuarios.update(id, changes);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usuarios.remove(id);
  }

  @Post('purge-inactivos')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async purgeInactive(@Body('days') days?: number) {
    return this.usuarios.purgeInactive(days ?? 30);
  }
}
