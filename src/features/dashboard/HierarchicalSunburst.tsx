import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

export interface SunburstLeaf {
  line_name: string
  machine_name: string
  equipment_name: string
  part_name: string
  value: number
}

interface ArcSegment {
  key: string
  path: string[]
  value: number
  start: number
  end: number
  color: string
  depth: number
  hasChildren: boolean
}

interface TreeNode {
  name: string
  value: number
  children: TreeNode[]
}

const SIZE = 220
const CENTER = SIZE / 2
const RINGS = [
  { r0: 18, r1: 38 },
  { r0: 40, r1: 60 },
  { r0: 62, r1: 82 },
  { r0: 84, r1: 104 },
]
const RING_OPACITY = [0.95, 0.75, 0.55, 0.36]
const GAP_DEG = 1.2

const LEVEL_KEYS: (keyof SunburstLeaf)[] = ['line_name', 'machine_name', 'equipment_name', 'part_name']

/** A rotating categorical palette — Line/Machine/Equipment/Part identity, not a status, so it avoids the app's reserved status colors (destructive/warning/success), same convention as RadialMapChart. */
function hueFor(index: number): string {
  return `hsl(${(index * 63) % 360} 62% 52%)`
}

function buildTree(rows: SunburstLeaf[], depth = 0): TreeNode[] {
  if (depth >= LEVEL_KEYS.length) return []
  const key = LEVEL_KEYS[depth]
  const groups = new Map<string, SunburstLeaf[]>()
  for (const row of rows) {
    const name = row[key] as string
    const group = groups.get(name)
    if (group) group.push(row)
    else groups.set(name, [row])
  }
  return Array.from(groups.entries()).map(([name, groupRows]) => ({
    name,
    value: groupRows.reduce((sum, r) => sum + r.value, 0),
    children: buildTree(groupRows, depth + 1),
  }))
}

/** Walks `path` down from `nodes`, returning the children of the node it lands on — falls back to `nodes` itself if a segment along the way no longer exists (e.g. data refetched and that branch disappeared). */
function childrenAtPath(nodes: TreeNode[], path: string[]): TreeNode[] {
  if (path.length === 0) return nodes
  const [head, ...rest] = path
  const match = nodes.find((n) => n.name === head)
  return match ? childrenAtPath(match.children, rest) : nodes
}

function layoutTree(nodes: TreeNode[], start: number, end: number, depth: number, color: string | null, parentPath: string[]): ArcSegment[] {
  const total = nodes.reduce((sum, n) => sum + n.value, 0)
  const span = end - start
  const gap = depth === 0 ? GAP_DEG : GAP_DEG * 0.6
  let cursor = start
  const segments: ArcSegment[] = []

  nodes.forEach((node, index) => {
    const rawSpan = total > 0 ? (node.value / total) * span : 0
    const segStart = cursor
    const segEnd = cursor + Math.max(rawSpan - gap, 0)
    const segColor = depth === 0 ? hueFor(index) : color ?? hueFor(index)
    const path = [...parentPath, node.name]

    segments.push({
      key: path.join('|'),
      path,
      value: node.value,
      start: segStart,
      end: segEnd,
      color: segColor,
      depth,
      hasChildren: node.children.length > 0,
    })

    if (node.children.length > 0 && segEnd > segStart) {
      segments.push(...layoutTree(node.children, segStart, segEnd, depth + 1, segColor, path))
    }

    cursor += rawSpan
  })

  return segments
}

function polarToCartesian(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) }
}

function ringSegmentPath(rInner: number, rOuter: number, startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  const startOuter = polarToCartesian(rOuter, endAngle)
  const endOuter = polarToCartesian(rOuter, startAngle)
  const startInner = polarToCartesian(rInner, endAngle)
  const endInner = polarToCartesian(rInner, startAngle)

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

/**
 * Four-ring zoomable sunburst: Line > Machine (or "Luar Line") > Equipment >
 * Part, each ring sized by `value` within its parent's angular span. Same
 * arc-math approach as RadialMapChart, extended from 2 to 4 levels.
 *
 * Clicking a segment that has children drills into it — that node's children
 * are re-laid-out from ring 0 so the drilled-into branch always fills the
 * whole circle with whatever depth it still has left, same idea as a d3
 * zoomable icicle/sunburst. The center circle (or the breadcrumb) zooms back
 * out. A leaf segment (no children, e.g. Part) is hover-only, no further
 * drill — cursor stays default there instead of pointer.
 */
export function HierarchicalSunburst({
  data,
  centerLabel,
  emptyMessage,
  formatValue,
  ariaLabel,
}: {
  data: SunburstLeaf[]
  centerLabel: string
  emptyMessage: string
  formatValue: (value: number) => string
  ariaLabel: string
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [focusPath, setFocusPath] = useState<string[]>([])
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const tree = buildTree(data)
  const focusedChildren = childrenAtPath(tree, focusPath)
  const focusedTotal = focusedChildren.reduce((sum, n) => sum + n.value, 0)
  const segments = layoutTree(focusedChildren, 0, 360, 0, null, focusPath)
  const hovered = segments.find((s) => s.key === hoveredKey) ?? null
  const isZoomed = focusPath.length > 0

  function zoomOut() {
    setFocusPath((p) => p.slice(0, -1))
    setHoveredKey(null)
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {isZoomed && (
        <div className="flex w-full items-center gap-1 overflow-x-auto text-[10px] text-muted-foreground">
          <button type="button" onClick={() => setFocusPath([])} className="shrink-0 hover:text-foreground hover:underline">
            Semua
          </button>
          {focusPath.map((name, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1">
              <ChevronRight className="size-3 shrink-0" />
              <button type="button" onClick={() => setFocusPath(focusPath.slice(0, i + 1))} className="max-w-20 truncate hover:text-foreground hover:underline">
                {name}
              </button>
            </span>
          ))}
        </div>
      )}

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel}>
        {segments.map((seg) => {
          const ring = RINGS[seg.depth]
          if (!ring || seg.end <= seg.start) return null
          return (
            <path
              key={seg.key}
              d={ringSegmentPath(ring.r0, ring.r1, seg.start, seg.end)}
              fill={seg.color}
              opacity={hoveredKey === seg.key ? 1 : RING_OPACITY[seg.depth]}
              className={seg.hasChildren ? 'cursor-pointer transition-opacity' : 'transition-opacity'}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey((current) => (current === seg.key ? null : current))}
              onClick={() => {
                if (seg.hasChildren) {
                  setFocusPath(seg.path)
                  setHoveredKey(null)
                }
              }}
            >
              <title>
                {seg.path.join(' → ')}: {formatValue(seg.value)}
              </title>
            </path>
          )
        })}
        <g onClick={isZoomed ? zoomOut : undefined} className={isZoomed ? 'cursor-pointer' : undefined}>
          <text x={CENTER} y={CENTER - 4} textAnchor="middle" className="fill-foreground text-base font-semibold">
            {formatValue(focusedTotal)}
          </text>
          <text x={CENTER} y={CENTER + 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
            {isZoomed ? '← kembali' : centerLabel}
          </text>
        </g>
      </svg>

      <div className="flex h-8 flex-col items-center justify-center text-center text-xs leading-tight">
        {hovered ? (
          <>
            <p className="max-w-full truncate text-muted-foreground">{hovered.path.join(' → ')}</p>
            <p className="font-medium tabular-nums">{formatValue(hovered.value)}</p>
          </>
        ) : (
          <p className="text-muted-foreground">Klik lapisan untuk masuk lebih dalam</p>
        )}
      </div>
    </div>
  )
}
