import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="relative"
      aria-label="Ganti tema"
      title="Ganti tema"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="scale-100 transition-transform dark:scale-0" />
      <Moon className="absolute scale-0 transition-transform dark:scale-100" />
    </Button>
  )
}
