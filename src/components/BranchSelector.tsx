import { useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'

export function BranchSelector() {
  const branches = useAuthStore((state) => state.user?.branches ?? [])
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const setActiveBranchId = useBranchStore((state) => state.setActiveBranchId)

  useEffect(() => {
    if (!activeBranchId && branches.length > 0) {
      setActiveBranchId(branches[0].id)
    }
  }, [activeBranchId, branches, setActiveBranchId])

  if (branches.length === 0) {
    return null
  }

  return (
    <Select
      value={activeBranchId ? String(activeBranchId) : ''}
      onValueChange={(value) => setActiveBranchId(Number(value))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Pilih cabang" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={String(branch.id)}>
            {branch.code} — {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
