import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface FormSheetProps {
  trigger: React.ReactNode
  title: string
  description?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass react-hook-form's `formState.isDirty` — guards against losing typed input. */
  isDirty: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  submitLabel: string
  isSubmitting?: boolean
  children: React.ReactNode
}

/**
 * Right-side drawer for create/edit forms (Line, Mesin, Equipment, ...),
 * matching the Part-install drawer's feel — the standard shape for
 * "add via laci" going forward. Three behaviors baked in per request:
 * - Dismissing the sheet (X, Escape, outside click) while `isDirty` asks
 *   "Buang perubahan?" instead of closing straight away.
 * - The first text field auto-focuses on open (Base UI's `initialFocus`
 *   callback, found by querying the form — no per-field ref wiring needed).
 * - Save sits in a footer pinned to the bottom of the drawer (not the
 *   top) — matches this app's existing DialogFooter convention, keeps
 *   the header free for title/close, and stays reachable without
 *   scrolling back up on a long form since it doesn't scroll with the
 *   fields above it.
 */
export function FormSheet({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  isDirty,
  onSubmit,
  submitLabel,
  isSubmitting,
  children,
}: FormSheetProps) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function handleOpenChange(next: boolean) {
    if (!next && isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    onOpenChange(next)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger render={trigger as React.ReactElement} />
        <SheetContent
          initialFocus={() => formRef.current?.querySelector<HTMLElement>('input, textarea') ?? undefined}
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <form ref={formRef} onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto">{children}</div>
            <div className="-mx-4 -mb-4 mt-4 flex shrink-0 justify-end gap-2 border-t bg-popover px-4 py-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : submitLabel}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu sudah mengisi sebagian form ini. Menutup sekarang akan membuang perubahan yang belum disimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Lanjutkan Mengisi</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDiscardOpen(false)
                onOpenChange(false)
              }}
            >
              Buang Perubahan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
