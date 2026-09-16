import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ScanLine } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { QrCameraScanner } from '@/components/QrCameraScanner'
import { fetchPartInstallations } from '@/features/part-installations/api'
import { fetchPartUnit } from '@/features/part-units/api'
import { parseScannedPartQr } from '@/lib/qr'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export interface ReplacePartResult {
  part_unit_id: number | null
  old_installation_id: number | null
}

interface ReplacePartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId: number
  partId: number
  partName: string
  onConfirm: (result: ReplacePartResult) => void
}

type Step =
  | { kind: 'pick-unit' }
  | { kind: 'scan'; oldInstallationId: number | null }
  | { kind: 'error'; message: string; oldInstallationId: number | null }
  | { kind: 'success'; result: ReplacePartResult }

/**
 * Opens when a technician checks "Diganti" on a PM checklist item — scans
 * either a new-part QR (fresh unit off the shelf) or a part-unit QR (a
 * repaired unit going back in), resolving which currently-installed unit
 * it's replacing along the way. Closing/confirming here is what feeds
 * part_unit_id/old_installation_id into TaskService::completeChecklist().
 */
export function ReplacePartDialog({
  open,
  onOpenChange,
  equipmentId,
  partId,
  partName,
  onConfirm,
}: ReplacePartDialogProps) {
  const [step, setStep] = useState<Step>({ kind: 'pick-unit' })

  const { data: installations, isLoading } = useQuery({
    queryKey: ['part-installations', equipmentId],
    queryFn: () => fetchPartInstallations(equipmentId),
    enabled: open,
  })

  const activeForPart = useMemo(
    () => (installations ?? []).filter((i) => i.part_id === partId && i.is_active),
    [installations, partId],
  )

  useEffect(() => {
    if (!open) {
      setStep({ kind: 'pick-unit' })
      return
    }
    if (!isLoading) {
      setStep(
        activeForPart.length > 1
          ? { kind: 'pick-unit' }
          : { kind: 'scan', oldInstallationId: activeForPart[0]?.id ?? null },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLoading, activeForPart.length])

  async function handleDecode(text: string, oldInstallationId: number | null) {
    const parsed = parseScannedPartQr(text)

    if (!parsed) {
      setStep({ kind: 'error', message: 'QR tidak dikenali. Pastikan scan QR part atau unit part.', oldInstallationId })
      return
    }

    if (parsed.type === 'new-part') {
      if (parsed.partId !== partId) {
        setStep({ kind: 'error', message: 'QR ini untuk part lain, bukan ' + partName + '.', oldInstallationId })
        return
      }
      setStep({ kind: 'success', result: { part_unit_id: null, old_installation_id: oldInstallationId } })
      return
    }

    try {
      const unit = await fetchPartUnit(parsed.unitId)
      if (unit.part_id !== partId) {
        setStep({ kind: 'error', message: 'Unit ini bukan part ' + partName + '.', oldInstallationId })
        return
      }
      if (unit.status !== 'available') {
        setStep({
          kind: 'error',
          message: 'Unit ini berstatus "' + unit.status + '", belum siap dipasang.',
          oldInstallationId,
        })
        return
      }
      setStep({ kind: 'success', result: { part_unit_id: unit.id, old_installation_id: oldInstallationId } })
    } catch {
      setStep({ kind: 'error', message: 'Unit tidak ditemukan.', oldInstallationId })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan Part: {partName}</DialogTitle>
          <DialogDescription>
            Scan QR part baru dari rak, atau QR unit bekas yang sudah diperbaiki.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-48 w-full" />}

        {!isLoading && step.kind === 'pick-unit' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Ada {activeForPart.length} unit {partName} terpasang di equipment ini — pilih yang mana yang dilepas.
            </p>
            <div className="flex flex-wrap gap-2">
              {activeForPart.map((installation, index) => (
                <Button
                  key={installation.id}
                  type="button"
                  variant="outline"
                  onClick={() => setStep({ kind: 'scan', oldInstallationId: installation.id })}
                >
                  Unit {String.fromCharCode(65 + index)}
                  {installation.unit_code ? ` (${installation.unit_code})` : ''}
                </Button>
              ))}
            </div>
          </div>
        )}

        {step.kind === 'scan' && (
          <QrCameraScanner active onDecode={(text) => handleDecode(text, step.oldInstallationId)} />
        )}

        {step.kind === 'error' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">{step.message}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep({ kind: 'scan', oldInstallationId: step.oldInstallationId })}
            >
              <ScanLine />
              Scan Lagi
            </Button>
          </div>
        )}

        {step.kind === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="size-12 text-success" />
            <p className="text-sm font-medium">Part valid, ditandai terpasang.</p>
            <Button
              type="button"
              onClick={() => {
                onConfirm(step.result)
                onOpenChange(false)
              }}
            >
              Selesai
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
