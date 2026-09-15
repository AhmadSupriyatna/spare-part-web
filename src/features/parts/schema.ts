import { z } from 'zod'

export const partSchema = z.object({
  item_master_no: z.string().min(1, 'Item Master wajib diisi').max(100),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  description: z.string().optional(),
  unit: z.string().min(1, 'Satuan wajib diisi').max(50),
  category: z.string().optional(),
  estimated_lifetime_hours: z
    .string()
    .optional()
    .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 1), 'Harus angka lebih dari 0'),
})

export type PartFormValues = z.infer<typeof partSchema>
