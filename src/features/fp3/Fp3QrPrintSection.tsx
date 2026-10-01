import { useQuery } from '@tanstack/react-query'
import { FileWarning, PrinterIcon } from 'lucide-react'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import { EquipmentQrPrintCard } from '@/components/EquipmentQrPrintCard'
import { Button } from '@/components/ui/button'

/**
 * QR-per-branch for the public "Ajukan FP3" flow (`/fp3/request/:branchId`,
 * no login) — unlike Part/Line/Mesin, this isn't a list of selectable items:
 * one generic poster-sized QR per branch is meant to be printed once and
 * stuck on a board somewhere any staff member can reach, not handed out per
 * asset.
 */
export function Fp3QrPrintSection() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const activeBranch = useAuthStore((state) => state.user?.branches.find((b) => b.id === activeBranchId))

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const scanUrl = activeBranchId ? `${window.location.origin}/fp3/request/${activeBranchId}` : null

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fp3-qr-print-area, #fp3-qr-print-area * { visibility: visible; }
          #fp3-qr-print-area { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted-foreground">
          Satu QR untuk seluruh plant yang sedang aktif — cetak sekali, tempel di papan yang mudah dijangkau siapa
          saja. Scan untuk mengajukan FP3 (Formulir Permintaan Perbaikan dan Pembuatan), tanpa perlu login.
        </p>
        <Button onClick={() => window.print()} disabled={!activeBranchId}>
          <PrinterIcon />
          Cetak QR FP3
        </Button>
      </div>

      {!activeBranchId ? (
        <p className="text-sm text-destructive print:hidden">Pilih plant di header terlebih dahulu.</p>
      ) : (
        <div className="flex justify-center rounded-md border p-8 print:hidden">
          <EquipmentQrPrintCard
            badge="FP3"
            icon={FileWarning}
            title="Ajukan FP3"
            subLabel={activeBranch?.name ?? ''}
            purpose="Scan untuk Ajukan Perbaikan/Pembuatan"
            qrValue={scanUrl ?? ''}
            qrCm={7}
            companyName={companySetting?.name}
            companyLogoUrl={companySetting?.logo_url}
          />
        </div>
      )}

      {scanUrl && (
        <div id="fp3-qr-print-area" className="hidden">
          <EquipmentQrPrintCard
            badge="FP3"
            icon={FileWarning}
            title="Ajukan FP3"
            subLabel={activeBranch?.name ?? ''}
            purpose="Scan untuk Ajukan Perbaikan/Pembuatan"
            qrValue={scanUrl}
            qrCm={7}
            companyName={companySetting?.name}
            companyLogoUrl={companySetting?.logo_url}
          />
        </div>
      )}
    </div>
  )
}
