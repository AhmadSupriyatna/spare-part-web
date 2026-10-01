import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Download, Printer, Wallet, Pencil, Plus, Trash2 } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BudgetDrawer } from '@/features/budgets/BudgetDrawer'
import {
  createBudgetManualEntry,
  deleteBudget,
  deleteBudgetManualEntry,
  fetchBudgets,
  type Budget,
  type BudgetManualEntryType,
} from '@/features/budgets/api'
import { fetchLines } from '@/features/lines/api'
import { fetchMachines, fetchOutsideLineMachines } from '@/features/machines/api'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

function itemAssumptionLabel(item: Budget['items'][number]): string | null {
  if (item.estimated_failure_count_per_year != null) {
    return `≈ ${item.estimated_failure_count_per_year}x gagal/tahun`
  }
  if (item.replacement_probability_percent != null) {
    return `${item.replacement_probability_percent}% kemungkinan diganti/pemeriksaan`
  }
  return null
}

/** Per-part breakdown shown when a budget row is expanded — toggle between the "per Line" and "per Mesin" split. */
function BudgetItemBreakdown({ budget }: { budget: Budget }) {
  const [view, setView] = useState<'line' | 'machine'>('line')

  return (
    <div className="flex flex-col gap-3 bg-muted/20 p-3">
      {budget.items.length > 0 && (
        <div className="flex gap-1 self-start rounded-md border bg-background p-0.5">
          <Button variant={view === 'line' ? 'default' : 'ghost'} size="sm" onClick={() => setView('line')}>
            Per Line
          </Button>
          <Button variant={view === 'machine' ? 'default' : 'ghost'} size="sm" onClick={() => setView('machine')}>
            Per Mesin
          </Button>
        </div>
      )}
      {budget.items.map((item) => {
        const assumption = itemAssumptionLabel(item)
        const rows =
          view === 'line'
            ? item.by_line.map((row) => ({
                key: `line-${row.line_id ?? 'none'}`,
                label: row.line_name,
                active_installations: row.active_installations,
                pcs_per_year: row.pcs_per_year,
                estimated_cost: row.estimated_cost,
              }))
            : item.by_machine.map((row) => ({
                key: `machine-${row.machine_id ?? 'none'}`,
                label: `${row.machine_name} (${row.location_label})`,
                active_installations: row.active_installations,
                pcs_per_year: row.pcs_per_year,
                estimated_cost: row.estimated_cost,
              }))
        return (
          <div key={item.id} className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              {item.part_name}
              {assumption && <span className="font-normal text-muted-foreground"> ({assumption})</span>}
            </p>
            {rows.length === 0 ? (
              <p className="pl-3 text-xs text-muted-foreground">Tidak ada instalasi aktif saat ini.</p>
            ) : (
              <div className="flex flex-col gap-1 pl-3">
                {rows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {row.label} · {row.active_installations} unit terpasang · {row.pcs_per_year} pcs/tahun
                    </span>
                    <span className="font-medium tabular-nums">{currencyFormatter.format(Number(row.estimated_cost))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const manualEntryTypeLabel: Record<BudgetManualEntryType, string> = {
  planned: 'Tambahan Rencana',
  actual: 'Realisasi Manual',
}

/** Free-form entries outside the automatic forecast — extra planned amounts, or actual spend stock_ledger never saw. */
function BudgetManualEntries({ budget, branchId, canManage }: { budget: Budget; branchId: number; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [type, setType] = useState<BudgetManualEntryType>('actual')
  const [lineId, setLineId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [occurredAt, setOccurredAt] = useState('')

  const { data: lines } = useQuery({
    queryKey: ['lines', branchId],
    queryFn: () => fetchLines(branchId),
    enabled: formOpen,
  })
  const lineMachineQueries = useQueries({
    queries: (lines ?? []).map((line) => ({
      queryKey: ['machines', line.id],
      queryFn: () => fetchMachines(line.id),
      enabled: formOpen,
    })),
  })
  const { data: outsideLineMachines } = useQuery({
    queryKey: ['outside-line-machines', branchId],
    queryFn: () => fetchOutsideLineMachines(branchId),
    enabled: formOpen,
  })
  const machines = useMemo(() => {
    const fromLines = (lines ?? []).flatMap((line, index) =>
      (lineMachineQueries[index]?.data ?? []).map((m) => ({ ...m, location_label: line.name })),
    )
    const outside = (outsideLineMachines ?? []).map((m) => ({ ...m, location_label: 'Luar Line' }))
    return [...fromLines, ...outside]
  }, [lines, lineMachineQueries, outsideLineMachines])

  function resetForm() {
    setType('actual')
    setLineId('')
    setMachineId('')
    setDescription('')
    setAmount('')
    setOccurredAt('')
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createBudgetManualEntry(budget.id, {
        type,
        line_id: lineId ? Number(lineId) : undefined,
        machine_id: machineId ? Number(machineId) : undefined,
        description,
        amount: Number(amount) || 0,
        occurred_at: occurredAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', branchId] })
      toast.success('Entri manual berhasil ditambahkan.')
      resetForm()
      setFormOpen(false)
    },
    onError: () => toast.error('Gagal menambahkan entri manual.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBudgetManualEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', branchId] })
      toast.success('Entri manual berhasil dihapus.')
    },
  })

  return (
    <div className="flex flex-col gap-2 border-t bg-background p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Input Manual</p>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setFormOpen((prev) => !prev)}>
            <Plus className="size-3.5" />
            Tambah Entri Manual
          </Button>
        )}
      </div>

      {budget.manual_entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada entri manual.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {budget.manual_entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={entry.type === 'actual' ? 'secondary' : 'outline'} className="text-[10px]">
                    {manualEntryTypeLabel[entry.type]}
                  </Badge>
                  <span className="truncate font-medium">{entry.description}</span>
                </div>
                <p className="text-muted-foreground">
                  {entry.line_name ?? entry.machine_name ?? 'Umum'}
                  {entry.occurred_at ? ` · ${entry.occurred_at}` : ''}
                  {entry.created_by_name ? ` · ${entry.created_by_name}` : ''}
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{currencyFormatter.format(Number(entry.amount))}</span>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus entri manual"
                  onClick={() => deleteMutation.mutate(entry.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Jenis</Label>
              <Select value={type} onValueChange={(v) => setType((v as BudgetManualEntryType) ?? 'actual')}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actual">Realisasi Manual</SelectItem>
                  <SelectItem value="planned">Tambahan Rencana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Tanggal (opsional)</Label>
              <Input type="date" className="h-8" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Line (opsional)</Label>
              <Select value={lineId} onValueChange={(v) => setLineId(v ?? '')}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Umum" />
                </SelectTrigger>
                <SelectContent>
                  {lines?.map((line) => (
                    <SelectItem key={line.id} value={String(line.id)}>
                      {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Mesin (opsional)</Label>
              <Select value={machineId} onValueChange={(v) => setMachineId(v ?? '')}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Umum" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={String(machine.id)}>
                      {machine.name} ({machine.location_label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Keterangan</Label>
            <Input className="h-8" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Jumlah (Rp)</Label>
            <Input type="number" min={0} className="h-8" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button
            size="sm"
            className="self-start"
            disabled={createMutation.isPending || !description || !amount}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Menyimpan...' : 'Simpan Entri'}
          </Button>
        </div>
      )}
    </div>
  )
}

function toCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function exportBudgetsCsv(budgets: Budget[], year: number) {
  const headers = [
    'Strategi', 'Terencana', 'Corrective', 'Total Budget',
    'Realisasi Planned', 'Realisasi Unplanned', 'Realisasi Manual', 'Total Realisasi', '% Terpakai',
  ]
  const rows = budgets.map((budget) => {
    const totalAmount = Number(budget.total_amount)
    const actualTotal = Number(budget.actual_total ?? 0)
    const percent = totalAmount > 0 ? `${Math.round((actualTotal / totalAmount) * 100)}%` : '-'
    return [
      strategyMeta[budget.replacement_strategy].label,
      budget.planned_amount,
      budget.corrective_amount,
      budget.total_amount,
      budget.actual_planned ?? '0',
      budget.actual_unplanned ?? '0',
      budget.actual_manual ?? '0',
      String(actualTotal.toFixed(2)),
      percent,
    ]
  })

  const csv = [headers, ...rows].map((row) => row.map((cell) => toCsvValue(String(cell))).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ringkasan-budget_${year}.csv`
  link.click()
  URL.revokeObjectURL(url)
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
  const totalBudget = (budgets ?? []).reduce((sum, b) => sum + Number(b.total_amount), 0)

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
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #budget-print-area, #budget-print-area * { visibility: visible; }
          #budget-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <PageHeader
        title="Budget"
        description="Anggaran tahunan penggantian part per strategi penggantian, untuk plant ini."
        className="print:hidden"
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="size-3.5" />
              Tambah Budget
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-end gap-3 print:hidden">
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportBudgetsCsv(budgets, year)}>
              <Download className="size-3.5" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-3.5" />
              Cetak
            </Button>
          </div>
        )}

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
              <p className="font-semibold tabular-nums">{currencyFormatter.format(totalBudget)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Realisasi</p>
              <p className="font-semibold tabular-nums">{currencyFormatter.format(totalActual)}</p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 print:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : budgets?.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={`Belum ada budget untuk tahun ${year}`}
          description="Tambahkan budget per strategi penggantian part — centang part yang mau diikutkan dan isi estimasinya, hasilnya otomatis dipecah per Line & per Mesin."
          action={
            canManage && (
              <Button size="sm" onClick={openCreate}>
                Tambah Budget
              </Button>
            )
          }
        />
      ) : (
        <>
          <Table className="print:hidden">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Strategi Penggantian</TableHead>
                <TableHead className="text-right">Terencana (PM/Life Cycle)</TableHead>
                <TableHead className="text-right">Corrective</TableHead>
                <TableHead className="text-right">Total Budget</TableHead>
                <TableHead className="text-right">Realisasi (Planned/Unplanned/Manual)</TableHead>
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
                        aria-label="Lihat rincian"
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
                          {currencyFormatter.format(Number(budget.actual_unplanned ?? 0))} /{' '}
                          {currencyFormatter.format(Number(budget.actual_manual ?? 0))}
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
                        <BudgetItemBreakdown budget={budget} />
                        <BudgetManualEntries budget={budget} branchId={activeBranchId} canManage={canManage} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>

          <div id="budget-print-area" className="hidden flex-col gap-4 print:flex">
            <div>
              <p className="text-lg font-bold uppercase">Ringkasan Budget {year}</p>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-50 text-left text-xs font-semibold tracking-wide uppercase">
                  <th className="py-2 pl-2">Strategi</th>
                  <th className="py-2 text-right">Terencana</th>
                  <th className="py-2 text-right">Corrective</th>
                  <th className="py-2 text-right">Total Budget</th>
                  <th className="py-2 text-right">Realisasi</th>
                  <th className="py-2 pr-2 text-right">% Terpakai</th>
                </tr>
              </thead>
              <tbody>
                {budgets?.map((budget) => {
                  const totalAmount = Number(budget.total_amount)
                  const actualTotal = Number(budget.actual_total ?? 0)
                  const percent = totalAmount > 0 ? Math.round((actualTotal / totalAmount) * 100) : null
                  return (
                    <tr key={budget.id} className="border-b border-neutral-200">
                      <td className="py-2 pl-2 font-medium">{strategyMeta[budget.replacement_strategy].label}</td>
                      <td className="py-2 text-right tabular-nums">{currencyFormatter.format(Number(budget.planned_amount))}</td>
                      <td className="py-2 text-right tabular-nums">{currencyFormatter.format(Number(budget.corrective_amount))}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{currencyFormatter.format(totalAmount)}</td>
                      <td className="py-2 text-right tabular-nums">{currencyFormatter.format(actualTotal)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{percent != null ? `${percent}%` : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-800 font-bold">
                  <td className="py-2 pl-2">Total</td>
                  <td className="py-2 text-right tabular-nums">{currencyFormatter.format(totalPlanned)}</td>
                  <td className="py-2 text-right tabular-nums">{currencyFormatter.format(totalCorrective)}</td>
                  <td className="py-2 text-right tabular-nums">{currencyFormatter.format(totalBudget)}</td>
                  <td className="py-2 text-right tabular-nums">{currencyFormatter.format(totalActual)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {totalBudget > 0 ? `${Math.round((totalActual / totalBudget) * 100)}%` : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <BudgetDrawer open={drawerOpen} onOpenChange={setDrawerOpen} branchId={activeBranchId} editingBudget={editingBudget} />
    </div>
  )
}
