import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NameplateProps {
  label: string
  value: number
  sub: string
  icon: LucideIcon
  href: string
  tone?: 'default' | 'warning' | 'destructive'
  loading?: boolean
}

const toneValueClass: Record<NonNullable<NameplateProps['tone']>, string> = {
  default: 'text-foreground',
  warning: 'text-warning',
  destructive: 'text-destructive',
}

const toneLampClass: Record<NonNullable<NameplateProps['tone']>, string> = {
  default: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
}

/**
 * "Card Utama" stat nameplate — a compact single-row equipment-nameplate
 * motif (bolt dots in the corners, a lamp bar standing in for a status
 * indicator) instead of a tall stat card, so the row stays thin. `sub`
 * carries the extra detail (e.g. "2 terlambat") as a title tooltip rather
 * than visible text, since that's what keeps this card thin.
 */
export function Nameplate({ label, value, sub, icon: Icon, href, tone = 'default', loading }: NameplateProps) {
  return (
    <Link to={href} className="block" title={sub}>
      <div className="relative flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-sm transition-colors hover:bg-muted/40">
        <span className="absolute top-1.5 left-1.5 size-1 rounded-full bg-border" />
        <span className="absolute top-1.5 right-1.5 size-1 rounded-full bg-border" />
        <span className="absolute bottom-1.5 left-1.5 size-1 rounded-full bg-border" />
        <span className="absolute bottom-1.5 right-1.5 size-1 rounded-full bg-border" />

        <Icon className="size-4 shrink-0 text-muted-foreground" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[9.5px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          {loading ? (
            <div className="mt-0.5 h-5 w-10 animate-pulse rounded bg-muted" />
          ) : (
            <p className={cn('font-mono text-xl leading-tight font-semibold tabular-nums', toneValueClass[tone])}>{value}</p>
          )}
        </div>

        <span className={cn('h-6 w-1 shrink-0 rounded-full', tone === 'default' ? 'bg-muted' : toneLampClass[tone])} />
      </div>
    </Link>
  )
}
