import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryDto,
  ListCategoriesQueryDto,
  PaginatedCategoriesResponseDto,
  CategoryDto,
  UpdateCategoryDto,
} from './category.dto';

interface UserContext {
  id: string;
  role: string;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateCategoryDto): Promise<CategoryDto> {
    const created = await this.prisma.category.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.serializeCategory(created);
  }

  async findAll(user: UserContext, query: ListCategoriesQueryDto): Promise<PaginatedCategoriesResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    // Autorização: Usuários comuns veem apenas suas próprias categorias; ADMIN pode ver todas
    if (user.role !== 'ADMIN') {
      where.ownerId = user.id;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSortFields = ['createdAt', 'title'];
    const sortBy = allowedSortFields.includes(query.sortBy || '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      data: items.map((item) => this.serializeCategory(item)),
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findById(user: UserContext, id: string): Promise<CategoryDto> {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (user.role !== 'ADMIN' && category.ownerId !== user.id) {
      throw new ForbiddenException('Você não tem permissão para acessar esta categoria.');
    }

    return this.serializeCategory(category);
  }

  async update(user: UserContext, id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const existing = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (user.role !== 'ADMIN' && existing.ownerId !== user.id) {
      throw new ForbiddenException('Você não tem permissão para modificar esta categoria.');
    }

    const hasFieldChanges =
      (dto.title !== undefined && dto.title !== existing.title) ||
      (dto.description !== undefined && dto.description !== existing.description);

    //TODO: implementar validação se há alguma Task cadastrada com esse categoria, caso haja, não permitir alterações.
    // if (hasFieldChanges) {
    //   throw new BadRequestException(
    //     'Categorias com Tarefas associadas não podem ter seus detalhes modificados.',
    //   );
    // }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.serializeCategory(updated);
  }

  async remove(user: UserContext, id: string): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (user.role !== 'ADMIN' && existing.ownerId !== user.id) {
      throw new ForbiddenException('Você não tem permissão para excluir esta categoria.');
    }

    // Remoção lógica (Soft Delete)
    await this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private serializeCategory(category: any): CategoryDto {
    return {
      id: category.id,
      title: category.title,
      description: category.description,
      ownerId: category.ownerId,
      owner: category.owner
        ? {
            id: category.owner.id,
            name: category.owner.name,
            email: category.owner.email,
          }
        : undefined,
      createdAt: new Date(category.createdAt).toISOString(),
      updatedAt: new Date(category.updatedAt).toISOString(),
    };
  }
}
