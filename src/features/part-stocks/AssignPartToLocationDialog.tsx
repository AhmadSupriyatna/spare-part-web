import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { fetchPartStocksForBranch, updatePartStockLocation } from '@/features/part-stocks/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  trigger: React.ReactNode
}

export function AssignPartToLocationDialog({
  branchId,
  locationId,
  trigger,
}: AssignPartToLocationDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmValues, setConfirmValues] = useState<AssignPartToLocationFormValues | null>(null)
  const queryClient = useQueryClient()

  const { data: partStocks } = useQuery({
    queryKey: ['part-stocks', branchId],
    queryFn: () => fetchPartStocksForBranch(branchId),
    enabled: open,
  })

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssignPartToLocationFormValues>({
    resolver: zodResolver(assignPartToLocationSchema),
    defaultValues: { part_stock_id: '' },
  })

  const selectedStock = partStocks?.find((stock) => stock.id === Number(watch('part_stock_id')))
  const movingFromElsewhere =
    !!selectedStock?.location_id && selectedStock.location_id !== locationId

  const mutation = useMutation({
    mutationFn: (values: AssignPartToLocationFormValues) =>
      updatePartStockLocation(Number(values.part_stock_id), locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-stocks-for-location', locationId] })
      queryClient.invalidateQueries({ queryKey: ['part-stocks', branchId] })
      toast.success('Part berhasil ditempatkan di lokasi ini.')
      setOpen(false)
      setConfirmValues(null)
      reset()
    },
    onError: () => toast.error('Gagal menempatkan part ke lokasi ini.'),
  })

  const onSubmit = (values: AssignPartToLocationFormValues) => {
    if (movingFromElsewhere) {
      setConfirmValues(values)
      return
    }
    mutation.mutate(values)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={trigger as React.ReactElement} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Part ke Lokasi Ini</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
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
                      {partStocks?.map((stock) => (
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
              {movingFromElsewhere && (
                <p className="text-xs text-muted-foreground">
                  Part ini sedang ada di lokasi {selectedStock?.location_code} — akan dipindahkan ke sini.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmValues !== null} onOpenChange={(next) => !next && setConfirmValues(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pindahkan part ke lokasi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedStock?.part_name}" sedang tercatat di lokasi {selectedStock?.location_code}. Part
              akan dipindahkan dari sana ke lokasi ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmValues) mutation.mutate(confirmValues)
              }}
            >
              Pindahkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
