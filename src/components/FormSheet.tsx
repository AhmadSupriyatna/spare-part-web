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
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

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
 * Right-side drawer for create/edit forms (Line, Mesin, Equipment, jam
 * operasional, ...) — the standard template for "add via laci" going
 * forward. Non-modal and overlay-free like the Part-install drawer: the
 * page pushes over (see `Sheet`'s registration with `useSheetStackStore`
 * and AppLayout's margin-right) instead of a dark backdrop covering it.
 * Three behaviors baked in per request:
 * - Dismissing the sheet (X, Cancel, Escape, or clicking the now-visible
 *   page behind it) while `isDirty` asks "Buang perubahan?" instead of
 *   closing straight away.
 * - The first text field auto-focuses on open (Base UI's `initialFocus`
 *   callback, found by querying the form — no per-field ref wiring needed).
 * - A clear header band (title + optional description, divider below) and
 *   a sticky footer with both Batal and the primary submit action — not
 *   just a lone Save button floating at the bottom.
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
      <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
        <SheetTrigger render={trigger as React.ReactElement} />
        <SheetContent
          className="gap-0 p-0"
          showOverlay={false}
          initialFocus={() =>
            formRef.current?.querySelector<HTMLElement>('input:not([type="file"]), textarea') ?? undefined
          }
        >
          <div className="flex flex-col gap-1 border-b px-4 py-4 pr-10">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </div>
          <form ref={formRef} onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">{children}</div>
            <div className="flex shrink-0 justify-end gap-2 border-t bg-popover px-4 py-3">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
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
