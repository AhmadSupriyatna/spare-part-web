import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { fetchFp3Request } from '@/features/fp3/api'
import { Fp3PrintSection } from '@/features/fp3/Fp3PrintSection'
import { fetchCompanySetting } from '@/features/settings/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Cetak FP3 — see Fp3PrintSection for the actual layout. This page just
 * fetches the record and wraps it in the print chrome (Cetak button,
 * print-only visibility CSS), same pattern as every other print page in
 * this app.
 */
export function Fp3PrintPage() {
  const { id } = useParams<{ id: string }>()
  const fp3Id = Number(id)

  const { data: fp3, isLoading } = useQuery({
    queryKey: ['fp3-request', fp3Id],
    queryFn: () => fetchFp3Request(fp3Id),
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (isLoading || !fp3) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    )
  }

  const scanUrl = `${window.location.origin}/fp3/scan/${fp3.id}`

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fp3-print-area, #fp3-print-area * { visibility: visible; }
          #fp3-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <div id="fp3-print-area">
        <Fp3PrintSection fp3={fp3} companySetting={companySetting} scanUrl={scanUrl} />
      </div>
    </div>
  )
}
