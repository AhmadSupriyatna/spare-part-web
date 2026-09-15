import { cn } from '@/lib/utils'

interface PartDropTargetOverlayProps {
  title: string
  subtitle?: string
  isDropTargetActive: boolean
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: () => void
  onClose: () => void
  children: React.ReactNode
}

/**
 * Cinematic centered drop target for the drag-and-drop part-install
 * pattern: dims/blurs the whole page behind it and is the ONLY drop
 * target while shown — dropping on anything else behind the blur does
 * nothing. This is meant to become the standard "part input" layout
 * across the app (started 2026-09-15 on the Line Equipment page), so it
 * is deliberately generic — title/subtitle/children only, no coupling to
 * equipment or installations specifically. Pair it with a drag source
 * (e.g. PartPickerSheet) that tracks the dragged item and calls back into
 * whatever `onDrop` should do here.
 */
export function PartDropTargetOverlay({
  title,
  subtitle,
  isDropTargetActive,
  onDragEnter,
  onDragLeave,
  onDrop,
  onClose,
  children,
}: PartDropTargetOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          'flex max-h-[75vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-popover shadow-2xl transition-[box-shadow,border-color] duration-150',
          isDropTargetActive && 'border-primary ring-4 ring-primary/30',
        )}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          onDragEnter()
        }}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault()
          onDrop()
        }}
      >
        <div className="border-b px-4 py-3">
          <p className="truncate text-base font-semibold">{title}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
