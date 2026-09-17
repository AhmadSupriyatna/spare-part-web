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
