import { IsBoolean, IsOptional, IsString, MinLength, IsUUID, Matches, IsInt, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  // SKU: letras/números/guiones (puedes ajustar)
  @IsString()
  @MinLength(2)
  @Matches(/^[A-Za-z0-9-_]+$/, { message: 'sku solo permite letras, números, guiones y guion bajo' })
  sku!: string;

  @IsOptional()
  @IsString()
  talla?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsUUID()
  categoria_id!: string;

  // inventario
  @IsOptional()
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}