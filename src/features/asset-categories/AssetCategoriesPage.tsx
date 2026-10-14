import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Tags, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormSheet } from '@/components/FormSheet'
import { PageHeader } from '@/components/PageHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  createAssetCategory,
  deleteAssetCategory,
  fetchAssetCategories,
  updateAssetCategory,
} from '@/features/asset-categories/api'
import type { AssetCategory } from '@/features/asset-categories/api'

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(100),
})

type CategoryFormValues = z.infer<typeof categorySchema>

function AssetCategoryFormSheet({
  category,
  trigger,
}: {
  category?: AssetCategory
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEdit = Boolean(category)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '' },
  })

  useEffect(() => {
    if (open) reset({ name: category?.name ?? '' })
  }, [category, open, reset])

  const mutation = useMutation({
    mutationFn: ({ name }: CategoryFormValues) =>
      category
        ? updateAssetCategory(category.id, { name })
        : createAssetCategory({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] })
      toast.success(isEdit ? 'Category updated.' : 'Category added.')
      setOpen(false)
    },
    onError: () => toast.error('Could not save the category. Check that the name is unique.'),
  })

  const inputId = `asset-category-name-${category?.id ?? 'new'}`

  return (
    <FormSheet
      trigger={trigger}
      title={isEdit ? 'Edit Equipment Category' : 'Add Equipment Category'}
      open={open}
      onOpenChange={setOpen}
      isDirty={isDirty}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      submitLabel="Save"
      isSubmitting={mutation.isPending}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>Category name</Label>
        <Input id={inputId} autoComplete="off" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
    </FormSheet>
  )
}

export function AssetCategoriesPage() {
  const queryClient = useQueryClient()
  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: fetchAssetCategories,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAssetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] })
      toast.success('Category deleted.')
    },
    onError: (error) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message ?? 'Could not delete the category.')
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Equipment Categories"
        description="Manage the categories available for equipment."
        action={
          <AssetCategoryFormSheet
            trigger={<Button>Add Equipment Category</Button>}
          />
        }
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load asset categories.</p>
      ) : categories?.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <Tags className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No equipment categories have been added.</p>
          <AssetCategoryFormSheet trigger={<Button size="sm">Add Equipment Category</Button>} />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <AssetCategoryFormSheet
                    category={category}
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Edit category"><Pencil /></Button>}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label="Delete category"><Trash2 /></Button>}
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this category?</AlertDialogTitle>
                        <AlertDialogDescription>
                          “{category.name}” cannot be deleted while it is assigned to an existing asset.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(category.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
