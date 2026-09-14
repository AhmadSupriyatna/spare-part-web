import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchPartStocksForBranch, updatePartStockLocation } from '@/features/part-stocks/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const assignPartToLocationSchema = z.object({
  part_stock_id: z.string().min(1, 'Pilih part'),
})

type AssignPartToLocationFormValues = z.infer<typeof assignPartToLocationSchema>

interface AssignPartToLocationDialogProps {
  branchId: number
  locationId: number
  excludePartStockIds: number[]
  trigger: React.ReactNode
}

export function AssignPartToLocationDialog({
  branchId,
  locationId,
  excludePartStockIds,
  trigger,
}: AssignPartToLocationDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: partStocks } = useQuery({
    queryKey: ['part-stocks', branchId],
    queryFn: () => fetchPartStocksForBranch(branchId),
    enabled: open,
  })

  const options = partStocks?.filter((stock) => !excludePartStockIds.includes(stock.id))

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignPartToLocationFormValues>({
    resolver: zodResolver(assignPartToLocationSchema),
    defaultValues: { part_stock_id: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: AssignPartToLocationFormValues) =>
      updatePartStockLocation(Number(values.part_stock_id), locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-stocks-for-location', locationId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Part berhasil ditempatkan di lokasi ini.')
      setOpen(false)
      reset()
    },
    onError: () => toast.error('Gagal menempatkan part ke lokasi ini.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Part ke Lokasi Ini</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-2">
            <Label>Part</Label>
            <Controller
              control={control}
              name="part_stock_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih part" />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.map((stock) => (
                      <SelectItem key={stock.id} value={String(stock.id)}>
                        {stock.part_name ?? `Part #${stock.part_id}`}
                        {stock.location_code ? ` (saat ini di ${stock.location_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.part_stock_id && (
              <p className="text-sm text-destructive">{errors.part_stock_id.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Kalau part sudah ada di lokasi lain, memindahkannya ke sini akan menggantikan lokasi lamanya.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
