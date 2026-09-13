import { z } from 'zod'

export const partSchema = z.object({
  sku: z.string().min(1, 'SKU wajib diisi').max(100),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  description: z.string().optional(),
  unit: z.string().min(1, 'Satuan wajib diisi').max(50),
  category: z.string().optional(),
})

export type PartFormValues = z.infer<typeof partSchema>
