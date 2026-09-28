import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationMetaDto, PaginationQueryDto } from '../common/dto/pagination.dto';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Título da categoria', example: 'Infraestrutura', minLength: 3, maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
  @MaxLength(150, { message: 'O título deve ter no máximo 150 caracteres.' })
  title!: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada da categoria', example: 'Recursos de infraestrutura da aplicação.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres.' })
  description?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Título da categoria', example: 'Infraestrutura', minLength: 3, maxLength: 150 })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
  @MaxLength(150, { message: 'O título deve ter no máximo 150 caracteres.' })
  title?: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada da categoria', example: 'Recursos de infraestrutura da aplicação.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres.' })
  description?: string;
}

export class CategoryOwnerDto {
  @ApiProperty({ description: 'Identificador único do proprietário', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ description: 'Nome do proprietário', example: 'Ada Lovelace' })
  name!: string;

  @ApiProperty({ description: 'E-mail do proprietário', example: 'ada@example.com' })
  email!: string;
}

export class CategoryDto {
  @ApiProperty({ description: 'Identificador único da categoria', example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  id!: string;

  @ApiProperty({ description: 'Título da categoria', example: 'Infraestrutura' })
  title!: string;

  @ApiPropertyOptional({ description: 'Descrição da categoria', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Identificador do usuário proprietário', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  ownerId!: string;

  @ApiPropertyOptional({ description: 'Dados resumidos do proprietário', type: () => CategoryOwnerDto })
  owner?: CategoryOwnerDto;

  @ApiProperty({ description: 'Data de criação' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de última atualização' })
  updatedAt!: string;
}

export class PaginatedCategoriesResponseDto {
  @ApiProperty({ description: 'Lista de categorias paginadas', type: [CategoryDto] })
  data!: CategoryDto[];

  @ApiProperty({ description: 'Metadados de paginação', type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ListCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Campo de ordenação', enum: ['createdAt', 'title'], default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'title';

  @ApiPropertyOptional({ description: 'Direção da ordenação', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

