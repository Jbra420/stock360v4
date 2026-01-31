import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min, NotEquals } from 'class-validator';

export class AjusteDto {
  @IsOptional()
  @IsUUID()
  producto_id?: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsUUID()
  categoria_id?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  talla?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @IsOptional()
  @IsBoolean()
  eliminar_producto?: boolean;

  @IsInt()
  @NotEquals(0, { message: 'cantidad no puede ser 0 en un ajuste' })
  cantidad!: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}
