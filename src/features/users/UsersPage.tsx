import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, ShieldAlert, UserRoundCog, UserRoundX, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { activateUser, deactivateUser, fetchUsers } from '@/features/users/api'
import { UserFormDialog } from '@/features/users/UserFormDialog'
import { ROLE_LABELS } from '@/features/users/roles'
import { useIsSuperadmin } from '@/stores/use-has-role'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function UsersPage() {
  const isSuperadmin = useIsSuperadmin()
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    enabled: isSuperadmin,
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Pengguna dinonaktifkan.')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menonaktifkan pengguna.'
      toast.error(message)
    },
  })

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Pengguna diaktifkan kembali.')
    },
  })

  if (!isSuperadmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Tidak punya akses"
        description="Kelola Pengguna hanya bisa dibuka oleh Super Admin."
      />
    )
  }

  const filteredUsers = users?.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kelola Pengguna"
        description="Akun, tingkatan akses, dan cabang untuk setiap pengguna."
        action={<UserFormDialog trigger={<Button>Tambah Pengguna</Button>} />}
      />

      <Input
        placeholder="Cari nama atau email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filteredUsers?.length === 0 ? (
        <EmptyState
          icon={UserRoundCog}
          title={search ? 'Tidak ada pengguna yang cocok' : 'Belum ada pengguna'}
          description={search ? 'Coba kata kunci lain.' : 'Tambahkan pengguna pertama untuk mulai.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tingkatan</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="size-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABELS[user.roles[0]] ?? user.roles[0]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.roles[0] === 'superadmin'
                    ? 'Semua Cabang'
                    : user.branches.map((b) => b.code).join(', ') || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'success' : 'secondary'}>
                    {user.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <UserFormDialog
                    user={user}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Ubah pengguna" title="Ubah pengguna">
                        <Pencil />
                      </Button>
                    }
                  />
                  {user.is_active ? (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Nonaktifkan pengguna"
                            title="Nonaktifkan pengguna"
                          />
                        }
                      >
                        <UserRoundX />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Nonaktifkan {user.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Akun ini tidak akan bisa login sampai diaktifkan kembali. Riwayat tugas dan data lain
                            miliknya tetap utuh.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deactivateMutation.mutate(user.id)}>
                            Nonaktifkan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Aktifkan pengguna"
                      title="Aktifkan pengguna"
                      onClick={() => activateMutation.mutate(user.id)}
                    >
                      <UserRoundCheck />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
