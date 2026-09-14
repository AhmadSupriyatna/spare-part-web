import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'

export interface BreadcrumbSegment {
  label: string
  to?: string
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[]
  className?: string
}

export function Breadcrumb({ segments, className }: BreadcrumbProps) {
  return (
    <nav className={`flex flex-wrap items-center gap-1 text-sm text-muted-foreground ${className ?? ''}`}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 && <ChevronRight className="size-3.5 shrink-0" />}
          {segment.to ? (
            <Link to={segment.to} className="hover:text-foreground hover:underline">
              {segment.label}
            </Link>
          ) : (
            <span className="text-foreground">{segment.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
