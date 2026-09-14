import { useQuery } from '@tanstack/react-query'
import { PrinterIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { fetchParts } from '@/features/parts/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import type { Part } from '@/types/inventory'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface PrintEntry {
  part: Part
  copy: number
}

export function PrintQrCodesPage() {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false)
  const [dialogPartIds, setDialogPartIds] = useState<number[]>([])
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [printEntries, setPrintEntries] = useState<PrintEntry[] | null>(null)

  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const branches = useAuthStore((state) => state.user?.branches ?? [])
  const activeBranch = branches.find((b) => b.id === activeBranchId)

  const { data: parts, isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const filteredParts = useMemo(
    () =>
      parts?.filter(
        (part) =>
          part.name.toLowerCase().includes(search.toLowerCase()) ||
          part.item_master_no.toLowerCase().includes(search.toLowerCase()),
      ),
    [parts, search],
  )

  const allSelected = !!filteredParts?.length && filteredParts.every((p) => selectedIds.has(p.id))

  function toggleAll() {
    if (!filteredParts) return
    setSelectedIds((prev) => {
      if (allSelected) return new Set()
      const next = new Set(prev)
      filteredParts.forEach((p) => next.add(p.id))
      return next
    })
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openQuantityDialogFor(ids: number[]) {
    setQuantities((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        next[id] = next[id] ?? '1'
      })
      return next
    })
    setDialogPartIds(ids)
    setQuantityDialogOpen(true)
  }

  function confirmPrint() {
    const dialogParts = parts?.filter((p) => dialogPartIds.includes(p.id)) ?? []
    const entries: PrintEntry[] = []
    dialogParts.forEach((part) => {
      const qty = Math.max(1, Number(quantities[part.id]) || 1)
      for (let i = 0; i < qty; i++) {
        entries.push({ part, copy: i + 1 })
      }
    })
    setPrintEntries(entries)
    setQuantityDialogOpen(false)
    requestAnimationFrame(() => window.print())
  }

  const dialogParts = parts?.filter((p) => dialogPartIds.includes(p.id)) ?? []
  const scanBaseUrl = `${window.location.origin}/breakdown/scan`

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-print-area, #qr-print-area * { visibility: visible; }
          #qr-print-area { position: absolute; inset: 0; padding: 8px; }
        }
      `}</style>

      <PageHeader
        className="print:hidden"
        title="Cetak QR Code Part"
        description="Centang part yang mau dicetak QR-nya, lalu tentukan berapa lembar per part."
        action={
          <Button
            onClick={() => openQuantityDialogFor(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
          >
            Cetak Terpilih ({selectedIds.size})
          </Button>
        }
      />

      {!activeBranchId && (
        <p className="text-sm text-destructive print:hidden">
          Pilih cabang di header terlebih dahulu — QR akan menyimpan cabang ini agar tidak perlu
          dipilih lagi saat scan.
        </p>
      )}

      <Input
        placeholder="Cari nama atau Item Master..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm print:hidden"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2 print:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border print:hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Pilih semua" />
                </TableHead>
                <TableHead>Nama Part</TableHead>
                <TableHead>Item Master</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts?.map((part) => (
                <TableRow key={part.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(part.id)}
                      onCheckedChange={() => toggleOne(part.id)}
                      aria-label={`Pilih ${part.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{part.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {part.item_master_no}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{part.category ?? '-'}</TableCell>
                  <TableCell>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={`Cetak QR ${part.name}`}
                      aria-label={`Cetak QR ${part.name}`}
                      onClick={() => openQuantityDialogFor([part.id])}
                    >
                      <PrinterIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredParts?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Tidak ada part yang cocok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Jumlah Cetak per Part</DialogTitle>
            <DialogDescription>
              Tentukan berapa lembar QR yang mau dicetak untuk tiap part terpilih.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {dialogParts.map((part) => (
              <div key={part.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{part.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
                </div>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={quantities[part.id] ?? '1'}
                  onChange={(e) =>
                    setQuantities((prev) => ({ ...prev, [part.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={confirmPrint} disabled={!activeBranchId}>
              Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printEntries && activeBranchId && (
        <div id="qr-print-area" className="hidden grid-cols-3 gap-3 print:grid">
          {printEntries.map((entry, index) => (
            <div
              key={`${entry.part.id}-${entry.copy}-${index}`}
              className="flex flex-col items-center gap-1 rounded-md border p-2 text-center break-inside-avoid"
            >
              <div className="flex w-full items-center justify-center gap-1 border-b pb-1">
                {companySetting?.logo_url ? (
                  <img src={companySetting.logo_url} alt="" className="h-5 w-auto max-w-6 object-contain" />
                ) : (
                  <div className="flex size-5 items-center justify-center rounded border border-dashed text-[6px] text-muted-foreground">
                    Logo
                  </div>
                )}
                <p className="text-[9px] font-semibold leading-none">
                  {companySetting?.name ?? 'Nama Perusahaan'}
                </p>
              </div>
              <p className="text-[8px] leading-none text-muted-foreground">
                {activeBranch ? `${activeBranch.code} — ${activeBranch.name}` : ''}
              </p>
              <QRCodeSVG value={`${scanBaseUrl}/${entry.part.id}/${activeBranchId}`} size={64} />
              <p className="text-[10px] font-medium leading-tight">{entry.part.name}</p>
              <p className="font-mono text-[9px] text-muted-foreground">{entry.part.item_master_no}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
