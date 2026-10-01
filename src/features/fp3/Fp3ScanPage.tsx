import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router'
import { fetchPublicFp3Request } from '@/features/fp3/api'
import { Fp3PrintSection } from '@/features/fp3/Fp3PrintSection'
import { fetchCompanySetting } from '@/features/settings/api'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * QR Validator's digital view — scanning the QR printed on a Cetak FP3
 * lands here with no login, same shop-floor-friendly access level as
 * MaintenanceReportScanPage/MachineMonitoringPage. Renders the exact same
 * Fp3PrintSection the paper copy used, confirming the paper form is
 * genuine and letting anyone see it digitally — reflects current live
 * data rather than a frozen snapshot of what was true when it was printed.
 */
export function Fp3ScanPage() {
  const { id } = useParams<{ id: string }>()
  const fp3Id = Number(id)

  const { data: fp3, isLoading, isError } = useQuery({
    queryKey: ['public-fp3-request', fp3Id],
    queryFn: () => fetchPublicFp3Request(fp3Id),
    enabled: Number.isFinite(fp3Id),
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company', 'public'],
    queryFn: fetchCompanySetting,
    enabled: !!fp3,
  })

  return (
    <div className="min-h-svh bg-muted/40 p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-success">
            <ShieldCheck className="size-4.5 shrink-0" />
            Dokumen ini terverifikasi asli — versi digital dari Formulir Permintaan Perbaikan dan Pembuatan yang
            dicetak.
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : isError || !fp3 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              FP3 tidak ditemukan, atau QR ini sudah tidak berlaku.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Fp3PrintSection fp3={fp3} companySetting={companySetting} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
