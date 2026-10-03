import { createContext, useContext } from 'react'

const HeaderExtraSlotContext = createContext<HTMLDivElement | null>(null)

export const HeaderExtraSlotProvider = HeaderExtraSlotContext.Provider

/**
 * The shared AppLayout header's page-specific slot (next to BranchSelector)
 * — null until AppLayout has mounted the slot div. A page portals content
 * into it (via `createPortal(node, slot)`) instead of AppLayout needing a
 * prop/route-based switch for every page that wants header-level controls;
 * the portaled content disappears on its own once that page unmounts.
 */
export function useHeaderExtraSlot(): HTMLDivElement | null {
  return useContext(HeaderExtraSlotContext)
}
