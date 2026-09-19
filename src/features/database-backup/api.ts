import { apiClient } from '@/lib/api-client'

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename="?([^"]+)"?/)
  return match?.[1] ?? fallback
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function downloadFullBackup(): Promise<void> {
  const response = await apiClient.get('/admin/backup', { responseType: 'blob' })
  downloadBlob(response.data, filenameFromDisposition(response.headers['content-disposition'], 'backup.json'))
}

export async function downloadBranchBackup(branchId: number): Promise<void> {
  const response = await apiClient.get(`/branches/${branchId}/backup`, { responseType: 'blob' })
  downloadBlob(response.data, filenameFromDisposition(response.headers['content-disposition'], 'backup-plant.json'))
}

export async function restoreDatabase(file: File, password: string): Promise<void> {
  const formData = new FormData()
  formData.append('backup_file', file)
  formData.append('password', password)
  await apiClient.post('/admin/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
