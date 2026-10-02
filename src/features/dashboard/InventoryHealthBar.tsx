import { AmbientSignalBar } from '@/features/dashboard/AmbientSignalBar'

interface InventoryHealthBarProps {
  critical: number
  warning: number
  normal: number
}

/**
 * "Inventory Health" — carries the Normal/Peringatan/Kritis breakdown by
 * itself now that those used to also have their own separate top-row
 * Nameplate cards (removed as redundant — this bar is the one place for
 * that detail going forward).
 */
export function InventoryHealthBar({ critical, warning, normal }: InventoryHealthBarProps) {
  const total = critical + warning + normal
  const healthyPercent = total > 0 ? Math.round((normal / total) * 100) : 0
  const glowColorVar = critical > 0 ? 'var(--destructive)' : warning > 0 ? 'var(--warning)' : 'var(--success)'

  return (
    <AmbientSignalBar
      segments={[
        { key: 'normal', label: 'Normal', value: normal, colorVar: 'var(--success)' },
        { key: 'warning', label: 'Peringatan', value: warning, colorVar: 'var(--warning)' },
        { key: 'critical', label: 'Kritis', value: critical, colorVar: 'var(--destructive)' },
      ]}
      primaryValue={`${healthyPercent}%`}
      primaryLabel="sehat"
      glowColorVar={glowColorVar}
      emptyMessage="Belum ada part dengan stok di plant ini."
    />
  )
}
