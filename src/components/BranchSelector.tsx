import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'

export function BranchSelector() {
  const branches = useAuthStore((state) => state.user?.branches ?? [])
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const setActiveBranchId = useBranchStore((state) => state.setActiveBranchId)

  // persist's localStorage hydration isn't synchronous on first mount (it
  // resolves a tick after store creation) — without waiting for it, this
  // effect would see the pre-hydration default (null) and "correct" it to
  // branches[0] before the real persisted value ever gets a chance to load,
  // permanently clobbering a still-valid previous selection.
  const [hydrated, setHydrated] = useState(() => useBranchStore.persist.hasHydrated())
  useEffect(() => {
    if (hydrated) return
    return useBranchStore.persist.onFinishHydration(() => setHydrated(true))
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    // Also re-corrects a stale branch left over from a *previous* user on
    // this browser — activeBranchId persists in its own localStorage key,
    // separate from the session, so logging out doesn't clear it. Without
    // this check, a single-branch user logging in after someone else could
    // silently inherit a branch that isn't even theirs.
    if (branches.length > 0 && !branches.some((branch) => branch.id === activeBranchId)) {
      setActiveBranchId(branches[0].id)
    }
  }, [hydrated, activeBranchId, branches, setActiveBranchId])

  if (branches.length === 0) {
    return null
  }

  return (
    <Select
      value={activeBranchId ? String(activeBranchId) : ''}
      onValueChange={(value) => setActiveBranchId(Number(value))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Pilih plant" />
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
