import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  ListTodo,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ActionFeedback, EmptyState, ErrorState, LoadingState } from '../components/ui/state-feedback';
import {
  categoriesControllerFindAll,
  categoriesControllerCreate,
  categoriesControllerUpdate,
  categoriesControllerRemove,
} from '../lib/api-client';
import type {
  PaginatedCategoriesResponseDto,
  CategoryDto,
} from '../lib/api-client/models';

const categoryFormSchema = z.object({
  title: z
    .string()
    .min(3, 'O título deve ter no mínimo 3 caracteres.')
    .max(150, 'O título deve ter no máximo 150 caracteres.'),
  description: z.string().max(1000, 'Máximo de 1000 caracteres.').optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const editCategoryFormSchema = categoryFormSchema.extend({});

type EditCategoryFormValues = z.infer<typeof editCategoryFormSchema>;

export function CategoriesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Update URL Search Params helper
  const updateParams = (newParams: Record<string, string | number | undefined>) => {
    const updated = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(newParams)) {
      if (value === undefined || value === '') {
        updated.delete(key);
      } else {
        updated.set(key, String(value));
      }
    }
    setSearchParams(updated);
  };

  // Fetch Categories with TanStack Query
  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories', { page, search, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await categoriesControllerFindAll({
        page,
        pageSize: 8,
        ...(search ? { search } : {}),
        sortBy: sortBy as any,
        sortOrder,
      });
      return res.data;
    },
  });

  const paginatedData = response && 'data' in (response as PaginatedCategoriesResponseDto)
    ? (response as PaginatedCategoriesResponseDto)
    : null;

  const categories: CategoryDto[] = paginatedData?.data || [];
  const meta = paginatedData?.meta || { page: 1, pageSize: 8, total: 0, totalPages: 1 };

  // Form for Creating
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      title: '',
      description: ''
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await categoriesControllerCreate({
        title: data.title,
        description: data.description || undefined
      });
      return res.data;
    },
    onSuccess: (data) => {
      const created = data && 'title' in (data as CategoryDto) ? (data as CategoryDto) : null;
      setFeedback({
        type: 'success',
        message: created ? `Categoria "${created.title}" criada com sucesso!` : 'Categoria criada com sucesso!',
      });
      setIsCreateOpen(false);
      resetCreate();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { detail?: string })?.detail ||
        (err as { message?: string })?.message ||
        'Não foi possível criar a tarefa.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  // Edit
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        description?: string;
        dueDate?: string;
      };
    }) => {
      const res = await categoriesControllerUpdate(id, data as any);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Categoria atualizada com sucesso!' });
      setEditingCategory(null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { detail?: string })?.detail ||
        (err as { message?: string })?.message ||
        'Falha ao atualizar a categoria.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  // Delete Mutation (Soft Delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await categoriesControllerRemove(id);
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Categoria removida com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { detail?: string })?.detail ||
        (err as { message?: string })?.message ||
        'Falha ao excluir a categoria.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-blue-600" />
            Módulo de Referência: Categorias
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Exemplo didático para categorias, busca, paginação e remoção lógica.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {feedback && (
        <ActionFeedback
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Filter and Search Controls */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título..."
                defaultValue={search}
                onChange={(e) => updateParams({ search: e.target.value || undefined, page: 1 })}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>

            {/* Sorting */}
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                updateParams({ sortBy: sb, sortOrder: so, page: 1 });
              }}
              className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="createdAt:desc">Mais recentes primeiro</option>
              <option value="createdAt:asc">Mais antigas primeiro</option>
              <option value="title:asc">Título (A-Z)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Category List / State Views */}
      {isLoading ? (
        <LoadingState message="Carregando categorias..." />
      ) : isError ? (
        <ErrorState
          title="Erro ao buscar categorias"
          message="Não foi possível carregar as categorias no momento."
          onRetry={() => refetch()}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria encontrada"
          description={
            search
              ? 'Nenhum registro corresponde aos filtros selecionados.'
              : 'Você ainda não possui categorias criadas.'
          }
          action={
            search ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchParams(new URLSearchParams())}
              >
                Limpar todos os filtros
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                Criar primeira categoria
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => {
              const desc = typeof category.description === 'string' ? category.description : '';

              return (
                <Card
                  key={category.id}
                  className="overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-base text-slate-900 dark:text-white line-clamp-1">
                          {category.title}
                        </h3>
                      </div>

                      {desc && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {desc}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        {isAdmin && category.owner && (
                          <span className="text-[11px] text-slate-400">
                            Por: {category.owner.name}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            title="Reabrir Tarefa"
                            isLoading={updateMutation.isPending && updateMutation.variables?.id === category.id}
                            onClick={() =>
                              updateMutation.mutate({
                                id: category.id,
                                data: { },
                              })
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Reabrir</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="Editar Tarefa"
                          onClick={() => setEditingCategory(category)}
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Excluir Tarefa (Remoção Lógica)"
                          isLoading={deleteMutation.isPending && deleteMutation.variables === category.id}
                          onClick={() => {
                            if (confirm(`Deseja realmente remover a categoria "${category.title}"?`)) {
                              deleteMutation.mutate(category.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
            <div>
              Mostrando <strong>{categories.length}</strong> de <strong>{meta.total}</strong> tarefas
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                disabled={meta.page <= 1}
                onClick={() => updateParams({ page: Math.max(1, meta.page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium">
                {meta.page} de {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                disabled={meta.page >= meta.totalPages}
                onClick={() => updateParams({ page: meta.page + 1 })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Nova Categoria de Referência
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Crie uma categoria demonstrando regras de negócio e validação por formulário.
            </p>

            <form
              onSubmit={handleSubmitCreate((data) => {
                setFeedback(null);
                createMutation.mutate(data);
              })}
              className="space-y-4"
            >
              <Input
                label="Título"
                placeholder="Ex.: Infraestrutura, Marketing, RH..."
                {...registerCreate('title')}
                error={createErrors.title?.message}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhes opcionais sobre este categoria..."
                  {...registerCreate('description')}
                  className="flex w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
                {createErrors.description?.message && (
                  <span className="text-xs text-red-500">{createErrors.description.message}</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={createMutation.isPending}>
                  Criar Categoria
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSubmit={(data) => {
            setFeedback(null);
            updateMutation.mutate({ id: editingCategory.id, data });
          }}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditCategoryModal({
  category,
  onClose,
  onSubmit,
  isLoading,
}: {
  category: CategoryDto;
  onClose: () => void;
  onSubmit: (data: EditCategoryFormValues) => void;
  isLoading: boolean;
}) {
  const rawDesc = typeof category.description === 'string' ? category.description : '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditCategoryFormValues>({
    resolver: zodResolver(editCategoryFormSchema),
    defaultValues: {
      title: category.title,
      description: rawDesc
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Editar Categoria
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Atualize os campos da categoria.
        </p>

        <form
          onSubmit={handleSubmit((data) => {
            onSubmit({
              title: data.title,
              description: data.description || undefined
            });
          })}
          className="space-y-4"
        >
          <Input
            label="Título"
            {...register('title')}
            error={errors.title?.message}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Descrição
            </label>
            <textarea
              rows={3}
              {...register('description')}
              className="flex w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isLoading}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
