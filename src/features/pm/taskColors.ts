import type { Task } from '@/types/tasks'

export type TaskSource = 'library' | 'lifetime' | 'breakdown'

export function taskSource(task: Task): TaskSource {
  if (task.task_library_id != null) return 'library'
  if (task.part_checks && task.part_checks.length > 0) return 'lifetime'
  return 'breakdown'
}

export const taskSourceLabel: Record<TaskSource, string> = {
  library: 'Task Library',
  lifetime: 'Part Lifetime',
  breakdown: 'Breakdown',
}

/**
 * Shared across the PM Schedule calendar and the List WO table: blue for a
 * Task Library recipe, yellow for a Part Lifetime-worn flag, red for
 * ad-hoc/breakdown work with neither — green always wins once completed.
 */
export function taskChipVariant(task: Task): 'success' | 'default' | 'warning' | 'destructive' {
  if (task.status === 'completed') return 'success'

  const source = taskSource(task)
  if (source === 'library') return 'default'
  if (source === 'lifetime') return 'warning'
  return 'destructive'
}
