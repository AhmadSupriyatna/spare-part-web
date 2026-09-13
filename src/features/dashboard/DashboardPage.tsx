import { useAuthStore } from '@/stores/auth-store'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Selamat datang, {user?.name}. Peran: {user?.roles.join(', ') || '-'}
      </p>
    </div>
  )
}
