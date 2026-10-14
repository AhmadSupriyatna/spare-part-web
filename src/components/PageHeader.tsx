import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-muted-foreground"
                  aria-label={`Informasi tentang ${title}`}
                  title="Informasi halaman"
                />
              }
            >
              <CircleHelp className="size-4" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {action}
    </div>
  )
}
