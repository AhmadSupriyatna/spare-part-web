import { QRCodeSVG } from 'qrcode.react'
import type { Fp3Disposition, Fp3Request } from '@/features/fp3/api'
import type { CompanySetting } from '@/types/settings'

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'
}

const DISPOSITION_LABEL: Record<Fp3Disposition, string> = {
  open: 'Open',
  closed: 'Closed',
  closed_with_note: 'Closed with Note',
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>
}

interface Fp3PrintSectionProps {
  fp3: Fp3Request
  companySetting?: CompanySetting
  /** The QR Validator's scan URL — omitted on the digital (already-scanned) view, since a QR pointing back to itself has no purpose there. */
  scanUrl?: string | null
}

/**
 * Formulir Permintaan Perbaikan dan Pembuatan, laid out in two clear halves
 * matching the request's real lifecycle: Data Pengaju (filled at
 * submission, with the requester's own attached photo) and Data
 * Pelaksanaan (filled once Teknik & Automation picks it up, with their
 * completion photo), then a shared Serah Terima signature block and
 * disposition status. Reused as-is for the QR Validator's digital view
 * (see Fp3ScanPage) — same component, just no scanUrl.
 */
export function Fp3PrintSection({ fp3, companySetting, scanUrl }: Fp3PrintSectionProps) {
  const executorList = (fp3.executor_names ?? '').split(',').map((name) => name.trim()).filter(Boolean)
  const partUsages = fp3.part_usages ?? []

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 text-sm">
      <div className="flex h-14 items-center justify-between gap-4 border-b pb-3">
        <div className="flex h-full items-center gap-2">
          {companySetting?.logo_url ? (
            <img src={companySetting.logo_url} alt="" className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed text-[9px] text-muted-foreground">
              Logo
            </div>
          )}
          <div>
            <p className="font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
            <p className="text-xs text-muted-foreground">{fp3.branch_name ?? '-'}</p>
          </div>
        </div>
        <div className="flex h-full items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-xs text-muted-foreground">{fp3.code}</p>
            <p className="text-xs text-muted-foreground">Kepada: Teknik &amp; Automation</p>
          </div>
          {scanUrl && (
            <div className="flex h-full items-center">
              <QRCodeSVG value={scanUrl} size={56} />
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-base font-bold tracking-wide uppercase">
        Formulir Permintaan Perbaikan dan Pembuatan
      </p>

      <div className="flex flex-col gap-3 rounded-md border p-3">
        <SectionLabel>Data Pengaju</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Field label="Pengaju" value={fp3.requester_name} />
          <Field label="Departemen" value={fp3.department} />
          <Field label="Tanggal Diajukan" value={formatDate(fp3.created_at)} className="col-span-2" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Deskripsi</p>
          <p>{fp3.description}</p>
        </div>
        {fp3.request_photo_url && (
          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">Lampiran Foto</p>
            <img
              src={fp3.request_photo_url}
              alt="Lampiran dari pengaju"
              className="h-20 w-20 rounded-md border object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border p-3">
        <SectionLabel>Data Pelaksanaan</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Field label="Diterima Tanggal" value={formatDate(fp3.received_at)} />
          <Field label="Tanggal Selesai" value={formatDate(fp3.completed_at)} />
          <Field label="Nama Pelaksana" value={executorList.length > 0 ? executorList.join(', ') : '-'} className="col-span-2" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Uraian Pekerjaan</p>
          <p>{fp3.work_description ?? '-'}</p>
        </div>

        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">Spare Part yang Dipakai</p>
          {partUsages.length === 0 ? (
            <p className="text-muted-foreground">Tidak ada part yang dipakai.</p>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border px-1.5 py-1">Part</th>
                  <th className="border px-1.5 py-1">Kode</th>
                  <th className="w-16 border px-1.5 py-1 text-center">Qty</th>
                  <th className="border px-1.5 py-1">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {partUsages.map((usage) => (
                  <tr key={usage.id}>
                    <td className="border px-1.5 py-1">{usage.part_name}</td>
                    <td className="border px-1.5 py-1 font-mono">
                      {usage.item_master_no ?? (usage.is_registered ? '' : 'Manual')}
                    </td>
                    <td className="border px-1.5 py-1 text-center">{usage.quantity}</td>
                    <td className="border px-1.5 py-1">{usage.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Field label="Kondisi Area Setelah Pengerjaan" value={fp3.area_condition_after ?? '-'} />

        {fp3.completion_photo_url && (
          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">Foto Hasil Pekerjaan</p>
            <img
              src={fp3.completion_photo_url}
              alt="Foto hasil pekerjaan"
              className="h-20 w-20 rounded-md border object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Serah Terima Hasil</SectionLabel>
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <p className="mb-8 text-muted-foreground">Pelaksana FP3</p>
            <p className="border-t pt-1 font-medium">&nbsp;</p>
          </div>
          <div>
            <p className="mb-8 text-muted-foreground">Supervisor Maintenance/Automation</p>
            <p className="border-t pt-1 font-medium">{fp3.received_by_name ?? ' '}</p>
          </div>
          <div>
            <p className="mb-8 text-muted-foreground">Pengaju FP3</p>
            <p className="border-t pt-1 font-medium">{fp3.requester_name}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          {fp3.disposition ? (
            <>
              <span className="font-semibold">{DISPOSITION_LABEL[fp3.disposition]}</span>
              {fp3.disposition_note && <span className="text-muted-foreground">— {fp3.disposition_note}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">Belum ditentukan</span>
          )}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">F-TEK-CBT-001</p>
      </div>
    </div>
  )
}
