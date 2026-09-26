import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useLocation } from 'react-router'
import { fetchCompanySetting } from '@/features/settings/api'
import type { PartRepair, PartRepairDisposition } from '@/types/relations'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

interface PrintRepairHistoryLocationState {
  repairs: PartRepair[]
}

const dispositionLabels: Record<PartRepairDisposition, string> = {
  pending: 'Perlu Keputusan',
  in_repair: 'Proses Repair',
  repaired: 'Siap Dipasang',
  scrapped: 'Dibuang',
}

/**
 * Bulk print for RepairHistoryList's checkbox selection — same
 * router-state-instead-of-refetch approach as PrintWoChecklistsPage, since
 * RepairBoard already has every field this needs loaded.
 */
export function PrintRepairHistoryPage() {
  const location = useLocation()
  const repairs = (location.state as PrintRepairHistoryLocationState | null)?.repairs ?? []

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (repairs.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={History}
          title="Tidak ada riwayat untuk dicetak"
          description="Pilih riwayat perbaikan dari daftar lalu tekan tombol Cetak Terpilih."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #repair-print-area, #repair-print-area * { visibility: visible; }
          #repair-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak {repairs.length} Riwayat</Button>
      </div>

      <div id="repair-print-area" className="mx-auto flex w-full max-w-3xl flex-col gap-4 text-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            {companySetting?.logo_url ? (
              <img src={companySetting.logo_url} alt="" className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed text-[9px] text-muted-foreground">
                Logo
              </div>
            )}
            <div>
              <p className="font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
            </div>
          </div>
          <p className="font-semibold uppercase tracking-wide">Riwayat Perbaikan Part</p>
        </div>

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b">
              <th className="py-1.5">Part</th>
              <th className="py-1.5">Dilepas Dari</th>
              <th className="py-1.5">Dilepas</th>
              <th className="py-1.5">Diperbaiki</th>
              <th className="py-1.5">Biaya</th>
              <th className="py-1.5">Status</th>
              <th className="py-1.5">Oleh</th>
            </tr>
          </thead>
          <tbody>
            {repairs.map((repair) => (
              <tr key={repair.id} className="border-b align-top">
                <td className="py-1.5">
                  {repair.part_name}
                  <div className="font-mono text-[10px] text-muted-foreground">{repair.item_master_no}</div>
                </td>
                <td className="py-1.5">
                  {repair.equipment_name}
                  <div className="text-[10px] text-muted-foreground">
                    {repair.machine_name} / {repair.line_name}
                  </div>
                </td>
                <td className="py-1.5">{new Date(repair.removed_at).toLocaleDateString('id-ID')}</td>
                <td className="py-1.5">
                  {repair.repaired_at ? new Date(repair.repaired_at).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="py-1.5">{repair.repair_cost ?? '-'}</td>
                <td className="py-1.5">{dispositionLabels[repair.disposition]}</td>
                <td className="py-1.5">{repair.removed_by_name ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
