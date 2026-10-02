interface InlineSignalStripSegment {
  key: string
  value: number
  colorVar: string
}

interface InlineSignalStripProps {
  label: string
  segments: InlineSignalStripSegment[]
  primaryValue: string
  /** Extra context (e.g. "sehat", "tepat waktu") — shown as a tooltip only, same convention as Nameplate's `sub`, so this tile stays exactly as thin as the stat tiles above it. */
  primarySuffix: string
  emptyMessage: string
}

/**
 * Same shell as `Nameplate` (border, corner dots, padding, label/value font
 * sizes) so this tile matches the stat-tile row above it in height and type
 * — just swaps the single number for a segmented health bar.
 */
export function InlineSignalStrip({ label, segments, primaryValue, primarySuffix, emptyMessage }: InlineSignalStripProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="relative flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-sm" title={primarySuffix}>
      <span className="absolute top-1.5 left-1.5 size-1 rounded-full bg-border" />
      <span className="absolute top-1.5 right-1.5 size-1 rounded-full bg-border" />
      <span className="absolute bottom-1.5 left-1.5 size-1 rounded-full bg-border" />
      <span className="absolute bottom-1.5 right-1.5 size-1 rounded-full bg-border" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[9.5px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {total === 0 ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              {segments
                .filter((s) => s.value > 0)
                .map((s) => (
                  <div
                    key={s.key}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.colorVar }}
                    title={`${s.key}: ${s.value}`}
                  />
                ))}
            </div>
            <span className="shrink-0 font-mono text-xl leading-tight font-semibold tabular-nums">{primaryValue}</span>
          </div>
        )}
      </div>
    </div>
  )
}
