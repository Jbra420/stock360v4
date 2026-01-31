import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMovimientoDto {
  @IsUUID()
  producto_id!: string;

  @IsIn(['ENTRADA', 'SALIDA', 'AJUSTE'])
  tipo!: 'ENTRADA' | 'SALIDA' | 'AJUSTE';

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  nuevo_stock?: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  referencia?: string;
}