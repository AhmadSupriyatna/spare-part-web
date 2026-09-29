interface StockHealthDonutProps {
  critical: number
  warning: number
  normal: number
}

interface Segment {
  key: string
  label: string
  value: number
  /** Status colors — reserved, never reused for a "series", always shipped with an icon/label alongside the color per the dataviz status-color rule. */
  colorVar: string
}

/**
 * Radial (donut) composition of Kelola Stok's own Kritis/Peringatan/Normal
 * status — same computation as the Kelola Stok stat cards, so this can never
 * disagree with what that page shows. A conic-gradient ring (no SVG needed)
 * with the total centered in the hole and a legend below carrying the
 * percentage, since color alone never carries identity here.
 */
export function StockHealthDonut({ critical, warning, normal }: StockHealthDonutProps) {
  const total = critical + warning + normal
  const segments: Segment[] = [
    { key: 'critical', label: 'Kritis', value: critical, colorVar: 'var(--destructive)' },
    { key: 'warning', label: 'Peringatan', value: warning, colorVar: 'var(--warning)' },
    { key: 'normal', label: 'Normal', value: normal, colorVar: 'var(--success)' },
  ]

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada part dengan stok di plant ini.</p>
  }

  let cursor = 0
  const stops = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (cursor / total) * 100
      cursor += s.value
      const end = (cursor / total) * 100
      return `${s.colorVar} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative flex size-32 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
        role="img"
        aria-label={`Kesehatan stok: ${critical} kritis, ${warning} peringatan, ${normal} normal dari ${total} part`}
      >
        <div className="flex size-20 flex-col items-center justify-center rounded-full bg-card">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-[10px] text-muted-foreground">Part</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.colorVar }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium tabular-nums">{s.value}</span>
            <span className="text-xs text-muted-foreground">({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
