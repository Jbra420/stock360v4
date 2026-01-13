import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['admin', 'user'])
  rol?: 'admin' | 'user';

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Solo si quieres permitir reset de password desde el admin
  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;
}