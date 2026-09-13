import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BranchState {
  activeBranchId: number | null
  setActiveBranchId: (branchId: number) => void
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      activeBranchId: null,
      setActiveBranchId: (activeBranchId) => set({ activeBranchId }),
    }),
    { name: 'spare-part-active-branch' },
  ),
)
