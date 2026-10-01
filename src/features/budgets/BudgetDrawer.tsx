import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Budget } from '@/features/budgets/api'
import { createBudget, fetchBudgetPartsForStrategy, updateBudget } from '@/features/budgets/api'
import { partReplacementStrategyOptions } from '@/features/parts/schema'
import { fetchCompanySetting } from '@/features/settings/api'
import type { PartReplacementStrategy } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const WEEKS_PER_YEAR = 52

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

interface BudgetDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: number
  editingBudget: Budget | null
}

function reportError(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  toast.error(message)
}

/**
 * On-demand slide-in panel (only mounted/visible while `open`, unlike the
 * always-open Location/Supplier drawers) for creating or editing a budget
 * scoped to one Replacement Strategy. All 3 strategies now have an
 * automatic forecast (see BudgetForecastService), each needing a different
 * per-part input alongside the checkbox that includes it:
 *   - Life Based: no per-part input at all — "Estimasi Life Time (%)" is
 *     one assumption for the whole budget (global, not tuned per part),
 *     combined with the branch's average weekly operating hours.
 *   - Failure Based: "Estimasi Jumlah Kegagalan / Tahun" per part — failure
 *     rates genuinely vary by part type, so this stays per-part.
 *   - Scheduled: "% Kemungkinan Diganti Saat Pemeriksaan" per part,
 *     multiplied server-side against how often Task Library actually
 *     scheduled an inspection covering that part in the last 12 months.
 * "Estimasi Kenaikan Harga (%)" is global and applies to all 3 strategies
 * (price inflation isn't a function of replacement strategy). The Life
 * Based preview here is computed client-side from the same formula the
 * server uses so the numbers match; Scheduled's preview can't be computed
 * client-side (it depends on Task Library history), so its real numbers
 * only appear after saving. The persisted total is always recomputed
 * server-side regardless — a stale/tampered cost can't sneak in through
 * this form.
 */
export function BudgetDrawer({ open, onOpenChange, branchId, editingBudget }: BudgetDrawerProps) {
  const isEdit = !!editingBudget
  const queryClient = useQueryClient()

  const [strategy, setStrategy] = useState<PartReplacementStrategy>('life_based')
  const [year, setYear] = useState(String(new Date().getFullYear() + 1))
  const [globalLifetimePercent, setGlobalLifetimePercent] = useState('100')
  const [globalPriceIncreasePercent, setGlobalPriceIncreasePercent] = useState('0')
  const [includedPartIds, setIncludedPartIds] = useState<Set<number>>(new Set())
  const [failureCountByPart, setFailureCountByPart] = useState<Record<number, string>>({})
  const [replacementProbabilityByPart, setReplacementProbabilityByPart] = useState<Record<number, string>>({})
  const [correctiveAmount, setCorrectiveAmount] = useState('0')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return

    if (editingBudget) {
      setStrategy(editingBudget.replacement_strategy)
      setYear(String(editingBudget.year))
      setGlobalLifetimePercent(editingBudget.global_lifetime_percent ?? '100')
      setGlobalPriceIncreasePercent(editingBudget.global_price_increase_percent)
      setCorrectiveAmount(editingBudget.corrective_amount)
      setNotes(editingBudget.notes ?? '')
      setIncludedPartIds(new Set(editingBudget.items.map((item) => item.part_id)))
      const failureCount: Record<number, string> = {}
      const replacementProbability: Record<number, string> = {}
      editingBudget.items.forEach((item) => {
        if (item.estimated_failure_count_per_year != null) failureCount[item.part_id] = item.estimated_failure_count_per_year
        if (item.replacement_probability_percent != null) replacementProbability[item.part_id] = item.replacement_probability_percent
      })
      setFailureCountByPart(failureCount)
      setReplacementProbabilityByPart(replacementProbability)
    } else {
      setStrategy('life_based')
      setYear(String(new Date().getFullYear() + 1))
      setGlobalLifetimePercent('100')
      setGlobalPriceIncreasePercent('0')
      setIncludedPartIds(new Set())
      setFailureCountByPart({})
      setReplacementProbabilityByPart({})
      setCorrectiveAmount('0')
      setNotes('')
    }
  }, [open, editingBudget])

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
    enabled: open,
  })

  const isLifeBased = strategy === 'life_based'
  const isFailureBased = strategy === 'failure_based'
  const isScheduled = strategy === 'scheduled'

  const { data: parts, isLoading: partsLoading } = useQuery({
    queryKey: ['budget-parts', branchId, strategy],
    queryFn: () => fetchBudgetPartsForStrategy(branchId, strategy),
    enabled: open,
  })

  function toggleIncluded(partId: number) {
    setIncludedPartIds((prev) => {
      const next = new Set(prev)
      if (next.has(partId)) next.delete(partId)
      else next.add(partId)
      return next
    })
  }

  const avgWeeklyHours = companySetting?.avg_weekly_operating_hours || 85
  const hoursPerYear = avgWeeklyHours * WEEKS_PER_YEAR
  const priceIncreasePercent = Number(globalPriceIncreasePercent) || 0

  const rows = (parts ?? []).map((part) => {
    const included = includedPartIds.has(part.part_id)
    const adjustedUnitCost = Number(part.unit_cost) * (1 + priceIncreasePercent / 100)
    const hasLifetimeData = part.estimated_lifetime_hours != null && part.estimated_lifetime_hours > 0

    let pcsPerYear = 0
    if (isLifeBased && hasLifetimeData) {
      const lifetimePercent = Number(globalLifetimePercent) || 100
      const effectiveLifetimeHours = part.estimated_lifetime_hours! * (lifetimePercent / 100)
      pcsPerYear = effectiveLifetimeHours > 0 ? hoursPerYear / effectiveLifetimeHours : 0
    } else if (isFailureBased) {
      pcsPerYear = Number(failureCountByPart[part.part_id]) || 0
    }
    // Scheduled's pcs/year depends on Task Library history not available client-side — left at 0 (no preview).

    const cost = pcsPerYear * part.active_installations * adjustedUnitCost
    return { ...part, included, hasLifetimeData, pcsPerYear, cost }
  })
  const includedRows = rows.filter((r) => r.included)
  const previewableTotal = isScheduled ? null : includedRows.reduce((sum, r) => sum + r.cost, 0)
  const missingLifetimeRows = isLifeBased ? rows.filter((r) => r.included && !r.hasLifetimeData) : []

  const mutation = useMutation({
    mutationFn: () => {
      const items = includedRows.map((r) => ({
        part_id: r.part_id,
        estimated_failure_count_per_year: isFailureBased ? Number(failureCountByPart[r.part_id]) || 0 : undefined,
        replacement_probability_percent: isScheduled ? Number(replacementProbabilityByPart[r.part_id]) || 0 : undefined,
      }))
      const payload = {
        global_lifetime_percent: isLifeBased ? Number(globalLifetimePercent) || 100 : undefined,
        global_price_increase_percent: priceIncreasePercent,
        corrective_amount: Number(correctiveAmount) || 0,
        notes: notes || null,
        items,
      }
      return isEdit
        ? updateBudget(editingBudget!.id, payload)
        : createBudget(branchId, { ...payload, replacement_strategy: strategy, year: Number(year) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', branchId] })
      toast.success(isEdit ? 'Budget berhasil diperbarui.' : 'Budget berhasil ditambahkan.')
      onOpenChange(false)
    },
    onError: (error: unknown) =>
      reportError(error, 'Gagal menyimpan budget. Strategi & tahun ini mungkin sudah punya budget.'),
  })

  const canSave = !mutation.isPending && (isEdit || !!year)

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full gap-4 overflow-y-auto sm:max-w-lg" showOverlay={false}>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Ubah Budget' : 'Tambah Budget'}</SheetTitle>
          <SheetDescription>
            Per strategi penggantian — centang part yang mau diikutkan, lalu isi estimasinya. Hasilnya
            otomatis dipecah per Line & per Mesin.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Strategi Penggantian</Label>
              <Select
                value={strategy}
                onValueChange={(v) => setStrategy((v as PartReplacementStrategy) ?? 'life_based')}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {partReplacementStrategyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget-year">Tahun Anggaran</Label>
              <Input
                id="budget-year"
                type="number"
                disabled={isEdit}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isLifeBased && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="global-lifetime">Estimasi Life Time (%)</Label>
                <Input
                  id="global-lifetime"
                  type="number"
                  min={1}
                  step="1"
                  value={globalLifetimePercent}
                  onChange={(e) => setGlobalLifetimePercent(e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="global-price-increase">Estimasi Kenaikan Harga (%)</Label>
              <Input
                id="global-price-increase"
                type="number"
                min={0}
                step="1"
                value={globalPriceIncreasePercent}
                onChange={(e) => setGlobalPriceIncreasePercent(e.target.value)}
              />
            </div>
          </div>
          {isLifeBased && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Satu asumsi untuk semua part di budget ini. Jam operasi mingguan dipakai:{' '}
              <strong>{avgWeeklyHours} jam</strong> (ubah di Pengaturan &gt; Profil Perusahaan).
            </p>
          )}

          {partsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : parts?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada part aktif dengan strategi ini saat ini.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.part_id} className="flex flex-col gap-2 rounded-md border p-2">
                  <label className="flex cursor-pointer items-start gap-2">
                    <Checkbox checked={row.included} onCheckedChange={() => toggleIncluded(row.part_id)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.part_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {row.item_master_no} · {currencyFormatter.format(Number(row.unit_cost))}/unit ·{' '}
                        {row.active_installations} unit terpasang
                      </p>
                    </div>
                  </label>

                  {row.included && isLifeBased && !row.hasLifetimeData && (
                    <p className="text-xs text-warning">
                      Belum ada data estimasi umur pakai (jam) untuk part ini — tidak diikutkan dalam
                      perhitungan.
                    </p>
                  )}

                  {row.included && isFailureBased && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Estimasi Jumlah Kegagalan / Tahun</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        className="h-8"
                        value={failureCountByPart[row.part_id] ?? ''}
                        onChange={(e) => setFailureCountByPart((prev) => ({ ...prev, [row.part_id]: e.target.value }))}
                      />
                    </div>
                  )}

                  {row.included && isScheduled && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">% Kemungkinan Diganti Saat Pemeriksaan</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        className="h-8"
                        value={replacementProbabilityByPart[row.part_id] ?? ''}
                        onChange={(e) =>
                          setReplacementProbabilityByPart((prev) => ({ ...prev, [row.part_id]: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  {row.included && (isLifeBased ? row.hasLifetimeData : !isScheduled) && (
                    <p className="text-right text-xs tabular-nums text-muted-foreground">
                      ≈ {row.pcsPerYear.toFixed(2)} pcs/tahun · {currencyFormatter.format(row.cost)}/tahun
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {missingLifetimeRows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {missingLifetimeRows.length} part belum bisa diestimasi — lengkapi data umur pakai part-nya
              dulu di halaman Part.
            </p>
          )}

          {isScheduled && includedRows.length > 0 && (
            <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Angka pasti baru muncul setelah disimpan — dihitung dari seberapa sering part ini benar-benar
              diperiksa (Task Library) dikali % di atas.
            </p>
          )}

          {previewableTotal != null && includedRows.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              Total estimasi: <strong>{currencyFormatter.format(previewableTotal)}</strong> / tahun
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="corrective">Tambahan Anggaran Corrective</Label>
            <Input
              id="corrective"
              type="number"
              step="0.01"
              value={correctiveAmount}
              onChange={(e) => setCorrectiveAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-notes">Catatan</Label>
            <Textarea id="budget-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button onClick={() => mutation.mutate()} disabled={!canSave}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Budget'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
