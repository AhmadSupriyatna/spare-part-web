import { TaskLibraryBrowser } from '@/features/task-libraries/TaskLibraryBrowser'
import { PageHeader } from '@/components/PageHeader'

/**
 * Standalone page for the Line -> Machine -> Equipment Task Library
 * browser — split back out of Maintenance's toggle into its own nav item.
 */
export function TaskLibraryPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Task Library" description="Resep PM: aktivitas, equipment, dan part yang direncanakan." />
      <TaskLibraryBrowser />
    </div>
  )
}
