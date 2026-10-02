import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NameplateProps {
  label: string
  /** Pre-format money/other non-plain-integer values yourself (e.g. "Rp 1,2jt") — this just interpolates whatever is passed. */
  value: number | string
  sub: string
  icon: LucideIcon
  tone?: 'default' | 'warning' | 'destructive'
  loading?: boolean
  /** Navigates — exactly one of `href`/`onClick` should be given. */
  href?: string
  /** Acts as a toggle (e.g. a stat-card filter) instead of navigating. */
  onClick?: () => void
  /** Only meaningful with `onClick` — highlights the card as the active filter. */
  active?: boolean
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
 * Compact single-row equipment-nameplate motif (bolt dots in the corners, a
 * lamp bar standing in for a status indicator) instead of a tall stat card —
 * originally Dashboard's "Card Utama" row, now shared wherever a page needs
 * the same stat-tile language (e.g. Kelola Stok's filter cards). `sub`
 * carries the extra detail (e.g. "2 terlambat") as a title tooltip rather
 * than visible text, since that's what keeps this card thin. Renders as a
 * Link when given `href`, or a toggle button when given `onClick` (with
 * `active` highlighting the current selection) — never both.
 */
export function Nameplate({ label, value, sub, icon: Icon, href, onClick, active, tone = 'default', loading }: NameplateProps) {
  const content = (
    <div
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-sm transition-colors',
        (href || onClick) && 'hover:bg-muted/40',
        active && 'border-primary bg-primary/5 ring-1 ring-inset ring-primary/30',
      )}
    >
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
  )

  if (href) {
    return (
      <Link to={href} className="block" title={sub}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left" title={sub}>
        {content}
      </button>
    )
  }

  return (
    <div className="block" title={sub}>
      {content}
    </div>
  )
}
