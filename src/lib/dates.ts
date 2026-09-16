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
