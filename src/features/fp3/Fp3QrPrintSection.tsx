import { useQuery } from '@tanstack/react-query'
import { PrinterIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
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
          <div className="flex flex-col items-center gap-3 text-center">
            {companySetting?.logo_url ? (
              <img src={companySetting.logo_url} alt="" className="h-12 w-auto object-contain" />
            ) : (
              <div className="flex h-12 w-24 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
                Logo
              </div>
            )}
            <p className="text-sm font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
            <QRCodeSVG value={scanUrl ?? ''} size={200} />
            <p className="text-lg font-bold">SCAN UNTUK AJUKAN FP3</p>
            <p className="text-sm text-muted-foreground">{activeBranch?.name}</p>
          </div>
        </div>
      )}

      {scanUrl && (
        <div id="fp3-qr-print-area" className="hidden">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            {companySetting?.logo_url ? (
              <img src={companySetting.logo_url} alt="" className="h-16 w-auto object-contain" />
            ) : (
              <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
                Logo
              </div>
            )}
            <p className="text-lg font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
            <QRCodeSVG value={scanUrl} size={280} />
            <p className="text-2xl font-bold">SCAN UNTUK AJUKAN FP3</p>
            <p className="text-base text-muted-foreground">
              Formulir Permintaan Perbaikan dan Pembuatan — {activeBranch?.name}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
