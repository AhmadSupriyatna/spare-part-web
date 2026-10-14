import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

export function PrintPageActions({ printLabel = 'Cetak' }: { printLabel?: string }) {
  const navigate = useNavigate()

  return (
    <div className="flex justify-end gap-2 print:hidden">
      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft />
        Kembali
      </Button>
      <Button onClick={() => window.print()}>{printLabel}</Button>
    </div>
  )
}
