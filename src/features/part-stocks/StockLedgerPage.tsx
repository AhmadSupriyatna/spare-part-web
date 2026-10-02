import { StockLedgerTab } from '@/features/part-stocks/StockLedgerTab'
import { useBranchStore } from '@/stores/branch-store'
import { PageHeader } from '@/components/PageHeader'

/** Split out from Kelola Stok's old Tabs — that page is now stock-list only, so this in/out ledger report gets its own route instead of living behind an in-page tab. */
export function StockLedgerPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Transaksi Stok"
        description="Riwayat pergerakan stok — penerimaan, pemakaian, dan penyesuaian di plant yang sedang aktif."
      />
      <StockLedgerTab branchId={activeBranchId} />
    </div>
  )
}
