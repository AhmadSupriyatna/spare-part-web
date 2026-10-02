interface InventoryHealthBarProps {
  critical: number
  warning: number
  normal: number
}

/**
 * "Inventory Health" — an ambient signal bar (one continuous rounded strip,
 * segmented by share) instead of a gauge, replacing the old semicircle —
 * reads like a status-light strip on real plant equipment. Carries the
 * Normal/Peringatan/Kritis breakdown by itself now that those used to also
 * have their own separate top-row Nameplate cards (removed as redundant —
 * this bar is the one place for that detail going forward). A soft glow
 * matching the worst severity present stands in for an "ambient" light.
 */
export function InventoryHealthBar({ critical, warning, normal }: InventoryHealthBarProps) {
  const total = critical + warning + normal

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada part dengan stok di plant ini.</p>
  }

  const segments = [
    { key: 'normal', label: 'Normal', value: normal, colorVar: 'var(--success)' },
    { key: 'warning', label: 'Peringatan', value: warning, colorVar: 'var(--warning)' },
    { key: 'critical', label: 'Kritis', value: critical, colorVar: 'var(--destructive)' },
  ]
  const healthyPercent = Math.round((normal / total) * 100)
  const glowVar = critical > 0 ? 'var(--destructive)' : warning > 0 ? 'var(--warning)' : 'var(--success)'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold tabular-nums">{healthyPercent}%</span>
        <span className="text-xs text-muted-foreground">sehat</span>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" style={{ boxShadow: `0 0 10px -1px ${glowVar}` }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.colorVar }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
      </div>

      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1.5 text-sm">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.colorVar }} />
            {s.label} <span className="font-medium text-foreground tabular-nums">{s.value}</span>
            <span className="text-xs">({Math.round((s.value / total) * 100)}%)</span>
          </span>
        ))}
      </div>
    </div>
  )
}
