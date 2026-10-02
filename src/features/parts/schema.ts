import { Building2, CalendarClock, Clock, Layers, TriangleAlert } from 'lucide-react'
import { z } from 'zod'

/**
 * Deliberately just these 3 (Phase 3B Step 2) — ConditionBased/
 * InspectionBased/OnDemand were removed: condition/inspection observation
 * belongs to Task Library maintenance activity, not a Part-level
 * replacement policy, and "on demand" is a Task-creation trigger, not a
 * strategy. There is no safe default among these 3, so callers must never
 * fall back to one silently (see PartFormDialog).
 */
export const partReplacementStrategyOptions = [
  {
    value: 'life_based',
    label: 'Life Based',
    description: 'Diganti berdasarkan umur atau jam operasi.',
    icon: Clock,
  },
  {
    value: 'failure_based',
    label: 'Failure Based',
    description: 'Diganti ketika part mengalami kerusakan.',
    icon: TriangleAlert,
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    description: 'Diganti mengikuti jadwal yang ditentukan.',
    icon: CalendarClock,
  },
] as const

/**
 * Unlike replacement strategy, "standard" is a safe default — most parts
 * just follow the plant's own standard minimum; "installed" is only for
 * parts where full spare coverage per installed unit actually matters.
 */
export const partMinimumStockStrategyOptions = [
  {
    value: 'standard',
    label: 'Standar Minimum Plant',
    description: 'Ikut angka standar minimum stock plant ini (diatur di halaman Plant).',
    icon: Building2,
  },
  {
    value: 'installed',
    label: 'Part Terinstal',
    description: 'Mengikuti jumlah unit part ini yang sedang terpasang di plant ini.',
    icon: Layers,
  },
] as const

export const partSchema = z.object({
  item_master_no: z.string().min(1, 'Item Master wajib diisi').max(100),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  description: z.string().optional(),
  unit: z.string().min(1, 'Satuan wajib diisi').max(50),
  estimated_lifetime_hours: z
    .string()
    .optional()
    .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 1), 'Harus angka lebih dari 0'),
  replacement_strategy: z.enum(['life_based', 'failure_based', 'scheduled']),
  minimum_stock_strategy: z.enum(['installed', 'standard']),
  has_passport: z.boolean(),
})

export type PartFormValues = z.infer<typeof partSchema>
