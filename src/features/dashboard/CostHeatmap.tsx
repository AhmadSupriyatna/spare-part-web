import { cn } from '@/lib/utils'
import type { CostHeatmapCell } from '@/features/dashboard/api'

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

function compactRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}rb`
  return value.toLocaleString('id-ID')
}

/** Sequential single-hue (primary) intensity per (line, machine) cell — same convention as Part Detail's installation-count heatmap, just cost-valued instead of count-valued. */
function heatCellClass(cost: number, max: number): string {
  if (cost === 0) return 'bg-muted/40 text-muted-foreground'
  const ratio = cost / max
  if (ratio >= 0.75) return 'bg-primary text-primary-foreground'
  if (ratio >= 0.5) return 'bg-primary/70 text-primary-foreground'
  if (ratio >= 0.25) return 'bg-primary/40 text-foreground'
  return 'bg-primary/20 text-foreground'
}

/** "Peta Biaya per Line & Mesin" — actual spend (12 months) traced back to where it happened. "Luar Line" collects both an outside-line Machine's equipment and a fully standalone asset (using the asset's own name as the "machine" column in the latter case). */
export function CostHeatmap({ data }: { data: CostHeatmapCell[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada biaya pemakaian part tercatat dalam 12 bulan terakhir.</p>
  }

  const lines = Array.from(new Set(data.map((d) => d.line_name)))
  const machines = Array.from(new Set(data.map((d) => d.machine_name)))
  const max = Math.max(1, ...data.map((d) => Number(d.cost)))
  const costFor = (line: string, machine: string) => Number(data.find((d) => d.line_name === line && d.machine_name === machine)?.cost ?? 0)

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {machines.map((machine) => (
              <th key={machine} className="p-1 text-left font-medium text-muted-foreground">
                {machine}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line}>
              <td className="p-1 pr-2 text-right font-medium text-muted-foreground">{line}</td>
              {machines.map((machine) => {
                const cost = costFor(line, machine)
                return (
                  <td key={machine} className="p-1">
                    <div
                      title={cost > 0 ? `${line} · ${machine}: ${currencyFormatter.format(cost)}` : undefined}
                      className={cn(
                        'flex h-9 min-w-16 items-center justify-center rounded px-1.5 text-[11px] font-medium',
                        heatCellClass(cost, max),
                      )}
                    >
                      {cost > 0 ? compactRupiah(cost) : ''}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
