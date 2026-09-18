import { z } from 'zod'

export function userSchema(isEdit: boolean) {
  return z
    .object({
      name: z.string().min(1, 'Nama wajib diisi').max(255),
      email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
      password: isEdit
        ? z.string().max(255).optional().or(z.literal('')).refine((v) => !v || v.length >= 8, 'Minimal 8 karakter')
        : z.string().min(8, 'Minimal 8 karakter').max(255),
      role: z.enum(['superadmin', 'supervisor', 'admin_spare_part', 'engineer']),
      branch_ids: z.array(z.number()),
    })
    .superRefine((values, ctx) => {
      if (values.role !== 'superadmin' && values.branch_ids.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['branch_ids'],
          message: 'Pilih minimal satu plant',
        })
      }
    })
}

export type UserFormValues = z.infer<ReturnType<typeof userSchema>>
