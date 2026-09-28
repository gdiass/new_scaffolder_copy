import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  const mockUser = {
    id: 'user-uuid-1',
    role: 'USER',
  };

  const mockOtherUser = {
    id: 'user-uuid-2',
    role: 'USER',
  };

  const mockAdmin = {
    id: 'admin-uuid-1',
    role: 'ADMIN',
  };

  const mockCategory = {
    id: 'category-uuid-1',
    title: 'Infraestrutura',
    description: 'Coisas relacionadas à infraestrutura',
    ownerId: 'user-uuid-1',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: 'user-uuid-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    },
  };

  beforeEach(() => {
    prisma = {
      category: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates category for authenticated user', async () => {
      prisma.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(mockUser.id, {
        title: 'Infraestrutura',
        description: 'Coisas relacionadas à infraestrutura',
      });

      expect(result.id).toBe(mockCategory.id);
      expect(result.ownerId).toBe(mockUser.id);
      expect(prisma.category.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('restricts query to own categories for regular users', async () => {
      prisma.category.count.mockResolvedValue(1);
      prisma.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAll(mockUser, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(1);
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            ownerId: mockUser.id,
          }),
        }),
      );
    });

    it('allows admin to query categories from all users', async () => {
      prisma.category.count.mockResolvedValue(1);
      prisma.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAll(mockAdmin, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(1);
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
      expect(prisma.category.findMany.mock.calls[0][0].where.ownerId).toBeUndefined();
    });
  });

  describe('findById and Ownership', () => {
    it('returns category when user is the owner', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      const result = await service.findById(mockUser, mockCategory.id);
      expect(result.id).toBe(mockCategory.id);
    });

    it('allows admin to view category owned by another user', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      const result = await service.findById(mockAdmin, mockCategory.id);
      expect(result.id).toBe(mockCategory.id);
    });

    it('throws ForbiddenException when another regular user tries to access category', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      await expect(service.findById(mockOtherUser, mockCategory.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when category does not exist or is deleted', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockUser, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update and Business Rules', () => {
    it('updates category when valid', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({
        ...mockCategory,
        title: 'Título da Categoria Atualizado',
      });

      const result = await service.update(mockUser, mockCategory.id, {
        title: 'Título da Categoria Atualizado',
      });

      expect(result.title).toBe('Título da Categoria Atualizado');
    });
  });

  describe('remove (Soft Delete)', () => {
    it('sets deletedAt on remove', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({
        ...mockCategory,
        deletedAt: new Date(),
      });

      await service.remove(mockUser, mockCategory.id);

      expect(prisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCategory.id },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('prevents non-owner regular user from deleting category', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      await expect(service.remove(mockOtherUser, mockCategory.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
