import { z } from 'zod'

export const receiveStockSchema = z.object({
  quantity: z
    .string()
    .min(1, 'Jumlah wajib diisi')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 1, 'Jumlah minimal 1'),
  supplier_id: z.string().optional(),
  notes: z.string().optional(),
})

export type ReceiveStockFormValues = z.infer<typeof receiveStockSchema>

export const adjustStockSchema = z.object({
  quantity_change: z
    .string()
    .min(1, 'Jumlah wajib diisi')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) !== 0, 'Jumlah tidak boleh nol'),
  reason: z.string().min(1, 'Alasan wajib diisi'),
})

export type AdjustStockFormValues = z.infer<typeof adjustStockSchema>
