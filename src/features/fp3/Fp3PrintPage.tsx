import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { fetchFp3Request } from '@/features/fp3/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function dateParts(value: string | null): { day: string; month: string; year: string } {
  if (!value) return { day: '-', month: '-', year: '-' }
  const date = new Date(value)
  return { day: String(date.getDate()), month: MONTH_NAMES[date.getMonth()], year: String(date.getFullYear()) }
}

const cell = 'border border-foreground/60 px-2 py-1'
const label = `${cell} bg-muted/40 font-medium`

/**
 * Cetak FP3 — reproduces the paper "Formulir Permintaan Perbaikan dan
 * Pembuatan" form's exact grid layout (Diisi oleh Departemen Pengaju FP3 /
 * Diisi oleh Departemen Pelaksana FP3 / Serah Terima Hasil FP3 sections),
 * filled in from the digital record. Uses the tenant's own configured
 * company logo/name in the header slot instead of a hardcoded brand mark.
 */
export function Fp3PrintPage() {
  const { id } = useParams<{ id: string }>()
  const fp3Id = Number(id)

  const { data: fp3, isLoading } = useQuery({
    queryKey: ['fp3-request', fp3Id],
    queryFn: () => fetchFp3Request(fp3Id),
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (isLoading || !fp3) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    )
  }

  const submitted = dateParts(fp3.created_at)
  const received = dateParts(fp3.received_at)
  const completed = dateParts(fp3.completed_at)
  const executorList = (fp3.executor_names ?? '').split(',').map((name) => name.trim()).filter(Boolean)
  const dispositionLabel = { open: 'OPEN', closed: 'CLOSED', closed_with_note: 'CLOSED with note' }

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fp3-print-area, #fp3-print-area * { visibility: visible; }
          #fp3-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <div id="fp3-print-area" className="mx-auto w-full max-w-3xl text-sm">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td colSpan={6} className="border border-foreground/60 p-2 text-center">
                <div className="flex flex-col items-center gap-1">
                  {companySetting?.logo_url ? (
                    <img src={companySetting.logo_url} alt="" className="h-10 w-auto object-contain" />
                  ) : (
                    <p className="text-lg font-bold text-destructive">{companySetting?.name ?? 'PERUSAHAAN'}</p>
                  )}
                  <p className="font-bold uppercase">Formulir</p>
                  <p className="font-bold uppercase">Permintaan Perbaikan dan Pembuatan</p>
                </div>
              </td>
            </tr>
            <tr>
              <td className={label}>No.</td>
              <td colSpan={5} className={`${cell} font-mono`}>{fp3.code}</td>
            </tr>
            <tr>
              <td className={label}>Kepada</td>
              <td colSpan={5} className={cell}>TEKNIK &amp; AUTOMATION</td>
            </tr>
            <tr>
              <td colSpan={6} className={`${label} text-center`}>Diisi Oleh Departemen Pengaju FP3</td>
            </tr>
            <tr>
              <td className={label}>Tanggal</td>
              <td className={cell}>{submitted.day}</td>
              <td className={label}>Bulan</td>
              <td className={cell}>{submitted.month}</td>
              <td className={label}>Tahun</td>
              <td className={cell}>{submitted.year}</td>
            </tr>
            <tr>
              <td className={label}>Pengaju</td>
              <td colSpan={2} className={cell}>{fp3.requester_name}</td>
              <td className={label}>Departemen</td>
              <td colSpan={2} className={cell}>{fp3.department}</td>
            </tr>
            <tr>
              <td colSpan={6} className={`${label} text-center`}>Deskripsi</td>
            </tr>
            <tr>
              <td colSpan={6} className={`${cell} h-24 align-top`}>{fp3.description}</td>
            </tr>

            <tr>
              <td colSpan={6} className={`${label} text-center`}>Diisi Oleh Departemen Pelaksana FP3</td>
            </tr>
            <tr>
              <td className={label}>Diterima tanggal</td>
              <td className={cell}>{received.day}</td>
              <td className={label}>Bulan</td>
              <td className={cell}>{received.month}</td>
              <td className={label}>Tahun</td>
              <td className={cell}>{received.year}</td>
            </tr>
            <tr>
              <td colSpan={6} className={`${label} text-center`}>Uraian Pekerjaan</td>
            </tr>
            <tr>
              <td colSpan={6} className={`${cell} h-24 align-top`}>{fp3.work_description ?? '-'}</td>
            </tr>
            <tr>
              <td className={label}>Tanggal Selesai</td>
              <td className={cell}>{completed.day}</td>
              <td className={label}>Bulan</td>
              <td className={cell}>{completed.month}</td>
              <td className={label}>Tahun</td>
              <td className={cell}>{completed.year}</td>
            </tr>
            <tr>
              <td className={label}>Nama Pelaksana</td>
              <td className={cell}>1. {executorList[0] ?? ''}</td>
              <td className={cell}>2. {executorList[1] ?? ''}</td>
              <td className={cell}>3. {executorList[2] ?? ''}</td>
              <td className={cell}>4. {executorList[3] ?? ''}</td>
              <td className={cell}>5. {executorList[4] ?? ''}</td>
            </tr>

            <tr>
              <td className={label}>Spare Part Yang Dipakai</td>
              <td colSpan={2} className={label}>Kode</td>
              <td className={label}>Jumlah</td>
              <td colSpan={2} className={label}>Keterangan</td>
            </tr>
            {(fp3.part_usages ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className={`${cell} h-8`} />
              </tr>
            ) : (
              fp3.part_usages?.map((usage) => (
                <tr key={usage.id}>
                  <td className={cell}>{usage.part_name}</td>
                  <td colSpan={2} className={`${cell} font-mono`}>{usage.item_master_no ?? (usage.is_registered ? '' : 'Manual')}</td>
                  <td className={cell}>{usage.quantity}</td>
                  <td colSpan={2} className={cell}>{usage.notes ?? ''}</td>
                </tr>
              ))
            )}

            <tr>
              <td className={label}>Kondisi area setelah pengerjaan</td>
              <td colSpan={5} className={cell}>{fp3.area_condition_after ?? '-'}</td>
            </tr>

            <tr>
              <td colSpan={6} className={`${label} text-center`}>Serah Terima Hasil FP3</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${label} text-center`}>Pelaksana FP3</td>
              <td colSpan={2} className={`${label} text-center`}>Supervisor Maintenance/Automation</td>
              <td colSpan={2} className={`${label} text-center`}>Pengaju FP3</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} h-16 align-top`}></td>
              <td colSpan={2} className={`${cell} h-16 align-top`}></td>
              <td colSpan={2} className={`${cell} h-16 align-top`}></td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} text-center text-xs`}>
                Nama &amp; Tanda tangan
                <br />
                {fp3.received_by_name ?? ''}
              </td>
              <td colSpan={2} className={`${cell} text-center text-xs`}>Nama &amp; Tanda tangan</td>
              <td colSpan={2} className={`${cell} text-center text-xs`}>
                Nama &amp; Tanda tangan
                <br />
                {fp3.requester_name}
              </td>
            </tr>
            <tr>
              <td className={label}>Status</td>
              <td colSpan={5} className={`${cell} text-center font-medium`}>
                {fp3.disposition
                  ? Object.entries(dispositionLabel).map(([value, text]) => (
                      <span
                        key={value}
                        className={value === fp3.disposition ? 'mx-2 underline decoration-2 underline-offset-4' : 'mx-2 text-muted-foreground'}
                      >
                        {text}
                      </span>
                    ))
                  : 'OPEN / CLOSED / CLOSED with note'}
              </td>
            </tr>
            <tr>
              <td className={label}>Note</td>
              <td colSpan={5} className={`${cell} h-10 align-top`}>{fp3.disposition_note ?? ''}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-right font-mono text-[10px] text-muted-foreground">F-TEK-CBT-001</p>
      </div>
    </div>
  )
}
