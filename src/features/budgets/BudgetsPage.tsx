import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Wallet, Pencil, Plus, Trash2 } from 'lucide-react'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'
import { BudgetDrawer } from '@/features/budgets/BudgetDrawer'
import { deleteBudget, fetchBudgets, type Budget } from '@/features/budgets/api'
import { partReplacementStrategyOptions } from '@/features/parts/schema'
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

const strategyMeta = Object.fromEntries(partReplacementStrategyOptions.map((o) => [o.value, o]))

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

/** Per-part / per-Line breakdown shown when a budget row is expanded — this is the "hasil per line" view. */
function BudgetLineBreakdown({ budget }: { budget: Budget }) {
  return (
    <div className="flex flex-col gap-3 bg-muted/20 p-3">
      {budget.items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">
            {item.part_name}{' '}
            <span className="font-normal text-muted-foreground">
              ({item.estimated_lifetime_percent}% life time
              {Number(item.price_increase_percent) > 0 && `, +${item.price_increase_percent}% harga`})
            </span>
          </p>
          {item.by_line.length === 0 ? (
            <p className="pl-3 text-xs text-muted-foreground">Tidak ada instalasi aktif saat ini.</p>
          ) : (
            <div className="flex flex-col gap-1 pl-3">
              {item.by_line.map((line) => (
                <div key={line.line_id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {line.line_name} · {line.active_installations} unit terpasang · {line.pcs_per_year} pcs/tahun
                  </span>
                  <span className="tabular-nums font-medium">{currencyFormatter.format(Number(line.estimated_cost))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function BudgetsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()
  const [year, setYear] = useState(() => new Date().getFullYear() + 1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

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

  function openCreate() {
    setEditingBudget(null)
    setDrawerOpen(true)
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget)
    setDrawerOpen(true)
  }

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Budget"
        description="Anggaran tahunan penggantian part per strategi penggantian, untuk plant ini."
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="size-3.5" />
              Tambah Budget
            </Button>
          )
        }
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
          icon={Wallet}
          title={`Belum ada budget untuk tahun ${year}`}
          description="Tambahkan budget per strategi penggantian part — untuk Life Based, isi estimasi umur pakai tiap part dan hasilnya dihitung per Line."
          action={
            canManage && (
              <Button size="sm" onClick={openCreate}>
                Tambah Budget
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Strategi Penggantian</TableHead>
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
              <Fragment key={budget.id}>
                <TableRow>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Lihat rincian per Line"
                      onClick={() => setExpandedId((prev) => (prev === budget.id ? null : budget.id))}
                    >
                      {expandedId === budget.id ? <ChevronDown /> : <ChevronRight />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {(() => {
                        const Icon = strategyMeta[budget.replacement_strategy].icon
                        return <Icon className="size-3.5 text-muted-foreground" />
                      })()}
                      {strategyMeta[budget.replacement_strategy].label}
                    </span>
                  </TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Ubah budget"
                          title="Ubah budget"
                          onClick={() => openEdit(budget)}
                        >
                          <Pencil />
                        </Button>
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
                              <AlertDialogTitle>Hapus budget {strategyMeta[budget.replacement_strategy].label}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Budget tahun {budget.year} untuk strategi ini akan dihapus permanen.
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
                {expandedId === budget.id && (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <BudgetLineBreakdown budget={budget} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}

      <BudgetDrawer open={drawerOpen} onOpenChange={setDrawerOpen} branchId={activeBranchId} editingBudget={editingBudget} />
    </div>
  )
}
