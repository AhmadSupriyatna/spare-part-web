import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

/**
 * A `Card` with the same corner bolt-dot motif as `Nameplate`, so any page
 * using it reads as one consistent plant-control-panel UI instead of that
 * style being a Dashboard-only one-off.
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
