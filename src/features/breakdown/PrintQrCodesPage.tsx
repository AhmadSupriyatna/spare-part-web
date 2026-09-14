import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { fetchParts } from '@/features/parts/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export function PrintQrCodesPage() {
  const [search, setSearch] = useState('')

  const { data: parts, isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
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

  const scanBaseUrl = `${window.location.origin}/breakdown/scan`

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-print-area, #qr-print-area * { visibility: visible; }
          #qr-print-area { position: absolute; inset: 0; padding: 12px; }
        }
      `}</style>

      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Cetak QR Code Part</h1>
          <p className="text-sm text-muted-foreground">
            Tempelkan QR ini di lokasi/rak part. Scan membuka halaman permintaan penggantian breakdown.
          </p>
        </div>
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <Input
        placeholder="Cari nama atau Item Master..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm print:hidden"
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div id="qr-print-area" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredParts?.map((part) => (
            <div
              key={part.id}
              className="flex flex-col items-center gap-2 rounded-md border p-4 text-center break-inside-avoid"
            >
              <QRCodeSVG value={`${scanBaseUrl}/${part.id}`} size={128} />
              <p className="text-sm font-medium leading-tight">{part.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
