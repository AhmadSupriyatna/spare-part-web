import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

/**
 * Every dashboard card wrapped in this instead of a bare `Card` — carries
 * the same corner bolt-dot motif as `Nameplate` (the "card utama" stat
 * row), so the whole page reads as one consistent plant-control-panel UI
 * rather than Nameplate being a one-off style.
 */
export function PanelCard({ className, children, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card className={cn('relative', className)} {...props}>
      <span className="absolute top-2 left-2 size-1 rounded-full bg-border" />
      <span className="absolute top-2 right-2 size-1 rounded-full bg-border" />
      <span className="absolute bottom-2 left-2 size-1 rounded-full bg-border" />
      <span className="absolute bottom-2 right-2 size-1 rounded-full bg-border" />
      {children}
    </Card>
  )
}
