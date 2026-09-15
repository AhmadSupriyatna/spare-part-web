import { create } from 'zustand'

interface SheetStackState {
  openCount: number
  registerOpen: () => void
  registerClose: () => void
}

/**
 * Tracks how many `Sheet`s (components/ui/sheet.tsx) are currently open,
 * anywhere in the app. AppLayout reads this to push the page content over
 * (margin-right) while any sheet is open, instead of the sheet floating
 * over/covering it — the "laci mendorong, bukan overlay" pattern. `Sheet`
 * itself registers/unregisters on every open/close, so any page using it
 * gets the push effect for free with no per-page wiring.
 */
export const useSheetStackStore = create<SheetStackState>((set) => ({
  openCount: 0,
  registerOpen: () => set((state) => ({ openCount: state.openCount + 1 })),
  registerClose: () => set((state) => ({ openCount: Math.max(0, state.openCount - 1) })),
}))
