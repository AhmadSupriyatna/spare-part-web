interface RankedBarListItem {
  label: string
  sublabel?: string
  value: number
}

interface RankedBarListProps {
  items: RankedBarListItem[]
  /** Defaults to a plain id-ID integer format. */
  formatValue?: (value: number) => string
  emptyMessage: string
  /** Tailwind color token for the bar fill — defaults to primary. */
  barColorClass?: string
}

const defaultFormat = (value: number) => value.toLocaleString('id-ID')

/**
 * Generic ranked top-N list with a proportional bar per row, sized against
 * the list's own max value — shared by Top Cost Parts, Beban Kerja per
 * Teknisi, and Fast/Slow Moving Parts instead of three near-identical
 * components, same hand-rolled-div approach (no charting library) as every
 * other chart in this folder.
 */
export function RankedBarList({ items, formatValue = defaultFormat, emptyMessage, barColorClass = 'bg-primary' }: RankedBarListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const max = Math.max(1, ...items.map((item) => item.value))

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="min-w-0 truncate font-medium" title={item.sublabel ? `${item.label} — ${item.sublabel}` : item.label}>
              {item.label}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{formatValue(item.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${barColorClass}`} style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
