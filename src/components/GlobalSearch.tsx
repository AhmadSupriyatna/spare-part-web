import { useQuery } from '@tanstack/react-query'
import { Factory, MapPin, Package, Search, Truck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { searchGlobal } from '@/features/search/api'
import { useBranchStore } from '@/stores/branch-store'
import { cn } from '@/lib/utils'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/**
 * Header-center global search. Queries the /search endpoint (parts globally,
 * equipment/suppliers/locations scoped to the active branch) and renders a
 * categorized dropdown; picking a result navigates straight to that record.
 */
export function GlobalSearch() {
  const navigate = useNavigate()
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(query.trim(), 300)

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debouncedQuery, activeBranchId],
    queryFn: () => searchGlobal(debouncedQuery, activeBranchId),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const totalResults = useMemo(() => {
    if (!data) return 0
    return data.parts.length + data.equipment.length + data.suppliers.length + data.locations.length
  }, [data])

  function goTo(path: string) {
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  const showDropdown = open && debouncedQuery.length >= 2

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              e.currentTarget.blur()
            }
          }}
          placeholder="Cari part, equipment, supplier, lokasi..."
          className="h-9 w-full rounded-md border bg-background pr-3 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 z-50 mt-1.5 max-h-[26rem] w-full overflow-y-auto rounded-md border bg-popover p-1.5 text-popover-foreground shadow-md">
          {isFetching && !data ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">Mencari...</p>
          ) : totalResults === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              Tidak ada hasil untuk &quot;{debouncedQuery}&quot;.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {data && data.parts.length > 0 && (
                <ResultGroup label="Part" icon={Package}>
                  {data.parts.map((part) => (
                    <ResultRow
                      key={part.id}
                      title={part.name}
                      subtitle={part.item_master_no}
                      onClick={() => goTo(`/parts/${part.id}`)}
                    />
                  ))}
                </ResultGroup>
              )}

              {data && data.equipment.length > 0 && (
                <ResultGroup label="Equipment" icon={Factory}>
                  {data.equipment.map((item) => (
                    <ResultRow
                      key={item.id}
                      title={item.name}
                      subtitle={`${item.line_name} · ${item.machine_name} · ${item.code}`}
                      onClick={() =>
                        goTo(`/lines?line=${item.line_id}&machine=${item.machine_id}&equipment=${item.id}`)
                      }
                    />
                  ))}
                </ResultGroup>
              )}

              {data && data.suppliers.length > 0 && (
                <ResultGroup label="Supplier" icon={Truck}>
                  {data.suppliers.map((supplier) => (
                    <ResultRow
                      key={supplier.id}
                      title={supplier.name}
                      onClick={() => goTo(`/suppliers/${supplier.id}`)}
                    />
                  ))}
                </ResultGroup>
              )}

              {data && data.locations.length > 0 && (
                <ResultGroup label="Lokasi" icon={MapPin}>
                  {data.locations.map((location) => (
                    <ResultRow
                      key={location.id}
                      title={location.code}
                      subtitle={location.description ?? undefined}
                      onClick={() => goTo(`/locations/${location.id}`)}
                    />
                  ))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultGroup({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1.5 px-2 pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {label}
      </p>
      {children}
    </div>
  )
}

function ResultRow({ title, subtitle, onClick }: { title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-start gap-0 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <span className="truncate font-medium">{title}</span>
      {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
    </button>
  )
}
