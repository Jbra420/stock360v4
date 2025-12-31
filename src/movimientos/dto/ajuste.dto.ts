import { IsInt, IsOptional, IsString, IsUUID, NotEquals } from 'class-validator';

export class AjusteDto {
  @IsUUID()
  producto_id!: string;

  @IsInt()
  @NotEquals(0, { message: 'cantidad no puede ser 0 en un ajuste' })
  cantidad!: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}