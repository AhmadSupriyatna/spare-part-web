export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Monday of the week containing `date` — every weekly calendar in this app
 * (Maintenance, Tugas Saya) starts the week on Monday, not Sunday.
 */
export function mondayOf(date: Date): Date {
  const jsDay = date.getDay() // 0 = Sunday
  const mondayOffset = (jsDay + 6) % 7
  const monday = new Date(date)
  monday.setDate(monday.getDate() - mondayOffset)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** ISO-8601 week number (1-53) for the "Minggu ke-N" label in Workspace. */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function diffInDays(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000)
}

export interface DueDateBadge {
  label: string
  variant: 'destructive' | 'warning' | 'secondary'
}

/**
 * Urgency-colored label for a WO's due date on the Workspace card: overdue
 * and "hari ini" are the two states that actually need to grab attention,
 * besok/lusa are a softer heads-up, and anything further out is just
 * informational (exact date + a day-count instead of a bare date).
 */
export function dueDateBadge(dueDate: string | null): DueDateBadge | null {
  if (!dueDate) return null

  const diffDays = diffInDays(toDateKey(new Date()), toDateKey(new Date(dueDate)))

  if (diffDays < 0) return { label: `Terlambat ${Math.abs(diffDays)} hari`, variant: 'destructive' }
  if (diffDays === 0) return { label: 'Hari Ini', variant: 'destructive' }
  if (diffDays === 1) return { label: 'Besok', variant: 'warning' }
  if (diffDays === 2) return { label: 'Lusa', variant: 'warning' }

  const formatted = new Date(dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  return { label: `${formatted} · ${diffDays} hari lagi`, variant: 'secondary' }
}
