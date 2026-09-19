import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Database, Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { fetchBranches } from '@/features/branches/api'
import { downloadBranchBackup, downloadFullBackup } from '@/features/database-backup/api'
import { RestoreDatabaseDialog } from '@/features/database-backup/RestoreDatabaseDialog'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function DatabaseBackupPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: fetchBranches })

  const fullBackupMutation = useMutation({
    mutationFn: downloadFullBackup,
    onSuccess: () => toast.success('Backup penuh berhasil diunduh.'),
    onError: () => toast.error('Gagal mengunduh backup.'),
  })

  const branchBackupMutation = useMutation({
    mutationFn: (branchId: number) => downloadBranchBackup(branchId),
    onSuccess: () => toast.success('Data plant berhasil diunduh.'),
    onError: () => toast.error('Gagal mengunduh data plant.'),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Backup & Restore Database"
        description="Simpan atau pulihkan data aplikasi. Khusus Superadmin."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-muted-foreground" />
            Backup Penuh
          </CardTitle>
          <CardDescription>
            Mengunduh seluruh data aplikasi (semua plant) dalam satu file JSON — cocok dipakai untuk
            memindahkan data antar komputer (misalnya kantor ke rumah) atau sebagai cadangan sebelum
            perubahan besar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => fullBackupMutation.mutate()} disabled={fullBackupMutation.isPending}>
            <Download />
            {fullBackupMutation.isPending ? 'Mengunduh...' : 'Unduh Backup Penuh'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Data per Plant</CardTitle>
          <CardDescription>
            Mengunduh data satu plant saja (part, stok, supplier, lokasi, budget, riwayat pemasangan,
            dst.) untuk arsip atau ditinjau. <strong>Bukan file yang bisa dipulihkan kembali</strong> —
            kalau perlu memulihkan data, gunakan Backup Penuh di atas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Select value={selectedBranchId} onValueChange={(value) => setSelectedBranchId(value ?? '')}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Pilih plant" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.code} — {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => branchBackupMutation.mutate(Number(selectedBranchId))}
            disabled={!selectedBranchId || branchBackupMutation.isPending}
          >
            <Download />
            {branchBackupMutation.isPending ? 'Mengunduh...' : 'Unduh Data Plant'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" />
            Pulihkan Database
          </CardTitle>
          <CardDescription>
            Mengganti SELURUH data saat ini dengan isi file backup penuh yang diunggah. Semua plant,
            bukan cuma satu — dan tidak bisa dibatalkan setelah berjalan. Pastikan file yang diunggah
            benar sebelum melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RestoreDatabaseDialog trigger={<Button variant="destructive">Pulihkan dari Backup</Button>} />
        </CardContent>
      </Card>
    </div>
  )
}
