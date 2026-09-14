import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="relative"
            aria-label="Ganti tema"
            title="Ganti tema"
          />
        }
      >
        <Sun className="scale-100 transition-transform dark:scale-0" />
        <Moon className="absolute scale-0 transition-transform dark:scale-100" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Terang</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Gelap</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>Ikuti Sistem</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
