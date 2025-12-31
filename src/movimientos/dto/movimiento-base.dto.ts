import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class MovimientoBaseDto {
  @IsUUID()
  producto_id!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}