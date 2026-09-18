import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PiggyBank, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BudgetFormDialog } from '@/features/budgets/BudgetFormDialog'
import { deleteBudget, fetchBudgets } from '@/features/budgets/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import { EmptyState } from '@/components/EmptyState'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

function percentUsedBadge(actualTotal: number, budgetTotal: number) {
  if (budgetTotal <= 0) return null
  const percent = Math.round((actualTotal / budgetTotal) * 100)
  const variant = percent >= 100 ? 'destructive' : percent >= 80 ? 'warning' : 'success'
  return (
    <Badge variant={variant} className="tabular-nums">
      {percent}% terpakai
    </Badge>
  )
}

export function BudgetsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()
  const [year, setYear] = useState(() => new Date().getFullYear() + 1)

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', activeBranchId, year],
    queryFn: () => fetchBudgets(activeBranchId!, year),
    enabled: !!activeBranchId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', activeBranchId] })
      toast.success('Budget berhasil dihapus.')
    },
  })

  const totalPlanned = (budgets ?? []).reduce((sum, b) => sum + Number(b.planned_amount), 0)
  const totalCorrective = (budgets ?? []).reduce((sum, b) => sum + Number(b.corrective_amount), 0)
  const totalActual = (budgets ?? []).reduce((sum, b) => sum + Number(b.actual_total ?? 0), 0)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Budget"
        description="Anggaran tahunan penggantian part per kategori, untuk plant ini."
        action={canManage && <BudgetFormDialog branchId={activeBranchId} trigger={<Button>Tambah Budget</Button>} />}
      />

      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-year">Tahun Anggaran</Label>
          <Input
            id="budget-year"
            type="number"
            className="w-32"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </div>
        {budgets && budgets.length > 0 && (
          <div className="ml-auto flex gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Total Terencana</p>
              <p className="font-semibold tabular-nums">{currencyFormatter.format(totalPlanned)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Corrective</p>
              <p className="font-semibold tabular-nums">{currencyFormatter.format(totalCorrective)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Anggaran {year}</p>
              <p className="font-semibold tabular-nums">{currencyFormatter.format(totalPlanned + totalCorrective)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Realisasi</p>
              <p className="font-semibold tabular-nums">{currencyFormatter.format(totalActual)}</p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : budgets?.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={`Belum ada budget untuk tahun ${year}`}
          description="Tambahkan budget per kategori part — bisa dihitung otomatis dari data life time part, lalu ditambah anggaran corrective sesuai kebutuhan."
          action={
            canManage && <BudgetFormDialog branchId={activeBranchId} trigger={<Button size="sm">Tambah Budget</Button>} />
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Terencana (PM/Life Cycle)</TableHead>
              <TableHead className="text-right">Corrective</TableHead>
              <TableHead className="text-right">Total Budget</TableHead>
              <TableHead className="text-right">Realisasi (Planned/Unplanned)</TableHead>
              <TableHead>Dibuat Oleh</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets?.map((budget) => (
              <TableRow key={budget.id}>
                <TableCell className="font-medium">{budget.category_label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {currencyFormatter.format(Number(budget.planned_amount))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {currencyFormatter.format(Number(budget.corrective_amount))}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {currencyFormatter.format(Number(budget.total_amount))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular-nums">{currencyFormatter.format(Number(budget.actual_total ?? 0))}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {currencyFormatter.format(Number(budget.actual_planned ?? 0))} /{' '}
                      {currencyFormatter.format(Number(budget.actual_unplanned ?? 0))}
                    </span>
                    {percentUsedBadge(Number(budget.actual_total ?? 0), Number(budget.total_amount))}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{budget.created_by_name ?? '-'}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  {canManage && (
                    <>
                      <BudgetFormDialog
                        branchId={activeBranchId}
                        budget={budget}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Ubah budget" title="Ubah budget">
                            <Pencil />
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="Hapus budget" title="Hapus budget" />
                          }
                        >
                          <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus budget {budget.category_label}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Budget tahun {budget.year} untuk kategori ini akan dihapus permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(budget.id)}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
