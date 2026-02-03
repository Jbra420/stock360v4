import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  IsUUID,
  Matches,
} from 'class-validator';

export class UpdateProductoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message: 'sku solo permite letras, números, guiones y guion bajo',
  })
  sku?: string;

  @IsOptional()
  @IsString()
  talla?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsUUID()
  categoria_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
