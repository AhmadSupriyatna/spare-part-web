import { ServerCrash } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

interface QueryErrorStateProps {
  onRetry: () => void
  title?: string
  description?: string
}

/** Shown instead of a loading skeleton/empty state when a query's `isError` is true — a flaky connection or a 500 should never silently render as "0" or "no data". */
export function QueryErrorState({
  onRetry,
  title = 'Gagal memuat data',
  description = 'Periksa koneksi internet, lalu coba lagi.',
}: QueryErrorStateProps) {
  return (
    <EmptyState
      icon={ServerCrash}
      title={title}
      description={description}
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          Coba Lagi
        </Button>
      }
    />
  )
}
