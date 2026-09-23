import { CalendarClock, ClipboardCheck, Clock, Gauge, TriangleAlert, Wrench } from 'lucide-react'
import { z } from 'zod'

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
    value: 'condition_based',
    label: 'Condition Based',
    description: 'Diganti berdasarkan kondisi aktual.',
    icon: Gauge,
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    description: 'Diganti mengikuti jadwal yang ditentukan.',
    icon: CalendarClock,
  },
  {
    value: 'inspection_based',
    label: 'Inspection Based',
    description: 'Diganti berdasarkan hasil inspeksi.',
    icon: ClipboardCheck,
  },
  {
    value: 'on_demand',
    label: 'On Demand',
    description: 'Diganti sesuai kebutuhan.',
    icon: Wrench,
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
  replacement_strategy: z.enum([
    'life_based',
    'failure_based',
    'condition_based',
    'scheduled',
    'inspection_based',
    'on_demand',
  ]),
})

export type PartFormValues = z.infer<typeof partSchema>
