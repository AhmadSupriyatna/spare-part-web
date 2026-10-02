import { InlineSignalStrip } from '@/features/dashboard/InlineSignalStrip'

interface InventoryHealthBarProps {
  critical: number
  warning: number
  normal: number
}

/** "Inventory Health" — Normal/Peringatan/Kritis as one thin inline strip, no card frame of its own. */
export function InventoryHealthBar({ critical, warning, normal }: InventoryHealthBarProps) {
  const total = critical + warning + normal
  const healthyPercent = total > 0 ? Math.round((normal / total) * 100) : 0

  return (
    <InlineSignalStrip
      label="Inventory Health"
      segments={[
        { key: 'Normal', value: normal, colorVar: 'var(--success)' },
        { key: 'Peringatan', value: warning, colorVar: 'var(--warning)' },
        { key: 'Kritis', value: critical, colorVar: 'var(--destructive)' },
      ]}
      primaryValue={`${healthyPercent}%`}
      primarySuffix="sehat"
      emptyMessage="Belum ada part dengan stok di plant ini."
    />
  )
}
