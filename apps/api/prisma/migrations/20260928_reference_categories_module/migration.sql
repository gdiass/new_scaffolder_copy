-- Migration: 20260928_reference_categories_module
-- Description: Módulo de referência Categories, ownership e soft delete (remoção lógica)


-- Consulta 001: Criação da tabela categories
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Consulta 002: Criação de índices para consultas rápidas por dono, e soft delete
CREATE INDEX "categories_ownerId_idx" ON "categories"("ownerId");
CREATE INDEX "categories_deletedAt_idx" ON "categories"("deletedAt");

-- Consulta 003: Foreign key relacionando ao perfil do usuário
ALTER TABLE "categories" ADD CONSTRAINT "categories_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
