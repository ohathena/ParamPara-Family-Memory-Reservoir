import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from './ui'
import { lifespan } from '../utils'

// Works out who is whose parent / spouse from the relationship list
function links(relationships) {
  const parentsOf = new Map() // childId -> Set(parentId)
  const spouses = []
  for (const r of relationships) {
    const [parent, child] = r.type === 'parent' ? [r.source, r.target] : r.type === 'child' ? [r.target, r.source] : []
    if (parent) {
      if (!parentsOf.has(child)) parentsOf.set(child, new Set())
      parentsOf.get(child).add(parent)
    } else if (r.type === 'spouse') spouses.push([r.source, r.target])
  }
  return { parentsOf, spouses }
}

// Each generation row becomes "units": a couple side by side, or one person.
// Units are ordered so children sit under their parents (average position of the parents above).
function layout(generations, relationships) {
  const { parentsOf, spouses } = links(relationships)
  const partner = new Map()
  for (const [a, b] of spouses) if (!partner.has(a) && !partner.has(b)) { partner.set(a, b); partner.set(b, a) }

  const position = new Map() // personId -> index in its row
  return generations.map((g) => {
    const inRow = new Set(g.members.map((m) => m.id))
    const byId = new Map(g.members.map((m) => [m.id, m]))
    const seen = new Set()
    const units = []
    for (const m of g.members) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      const p = partner.get(m.id)
      if (p && inRow.has(p) && !seen.has(p)) { seen.add(p); units.push([m, byId.get(p)]) } else units.push([m])
    }
    const score = (unit) => {
      const ps = unit.flatMap((m) => [...(parentsOf.get(m.id) || [])]).filter((id) => position.has(id))
      return ps.length ? ps.reduce((s, id) => s + position.get(id), 0) / ps.length : Infinity
    }
    const scored = units.map((u, i) => ({ u, s: score(u), i }))
    scored.sort((a, b) => (a.s === b.s ? a.i - b.i : a.s - b.s))
    let i = 0
    for (const { u } of scored) for (const m of u) position.set(m.id, i++)
    return { level: g.level, units: scored.map((x) => x.u) }
  })
}

function Node({ person, linkTo }) {
  const body = (
    <>
      <Avatar name={person.name} photo={person.photoUrl} size="lg" deceased={!!person.deathDate} />
      <span className="mt-2 block text-[13px] font-semibold leading-tight sm:text-[14px]">{person.name}</span>
      {person.nickname && <span className="block text-xs text-kumkum">{person.nickname}</span>}
      {lifespan(person.birthDate, person.deathDate) && <span className="mt-0.5 block text-xs text-ink-soft">{lifespan(person.birthDate, person.deathDate)}</span>}
    </>
  )
  const cls = 'flex w-[100px] flex-col sm:w-[128px] items-center rounded-[14px] border border-line bg-sheet px-2 py-3 text-center'
  return linkTo ? (
    <Link to={linkTo(person)} data-person={person.id} className={`${cls} hoverable focus-visible:outline-2`}>{body}</Link>
  ) : (
    <div data-person={person.id} className={cls}>{body}</div>
  )
}

// Draws the tree: rows of people, joined by marigold threads (measured from the real card positions)
export default function LineageTree({ generations, relationships, linkTo, animate = false, labels = false }) {
  const rows = useMemo(() => layout(generations, relationships), [generations, relationships])
  const box = useRef(null)
  const [paths, setPaths] = useState({ lines: [], w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const { parentsOf, spouses } = links(relationships)
    const measure = () => {
      const base = el.getBoundingClientRect()
      const rect = new Map()
      el.querySelectorAll('[data-person]').forEach((n) => {
        const r = n.getBoundingClientRect()
        rect.set(n.dataset.person, { x: r.left - base.left + r.width / 2, top: r.top - base.top, bottom: r.bottom - base.top, left: r.left - base.left, right: r.right - base.left, mid: r.top - base.top + 36 })
      })
      const lines = []
      // spouse threads: short line between the two cards at avatar height
      for (const [a, b] of spouses) {
        const A = rect.get(a)
        const B = rect.get(b)
        if (!A || !B || Math.abs(A.top - B.top) > 4) continue
        const [l, r] = A.x < B.x ? [A, B] : [B, A]
        lines.push(`M${l.right} ${l.mid} L${r.left} ${r.mid}`)
      }
      // parent threads: from the couple's middle (or the single parent) down to each child
      const drawn = new Set()
      for (const [child, parents] of parentsOf) {
        const C = rect.get(child)
        const P = [...parents].map((p) => rect.get(p)).filter(Boolean)
        if (!C || !P.length) continue
        const x1 = P.reduce((s, p) => s + p.x, 0) / P.length
        const y1 = P.length > 1 ? Math.max(...P.map((p) => p.mid)) : Math.max(...P.map((p) => p.bottom))
        const key = `${Math.round(x1)}-${child}`
        if (drawn.has(key) || y1 >= C.top) continue
        drawn.add(key)
        const ym = (Math.max(...P.map((p) => p.bottom)) + C.top) / 2
        lines.push(`M${x1} ${y1} L${x1} ${ym - 8} C${x1} ${ym}, ${C.x} ${ym}, ${C.x} ${ym + 8} L${C.x} ${C.top}`)
      }
      setPaths({ lines, w: el.scrollWidth, h: el.scrollHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [rows, relationships])

  return (
    <div className="overflow-x-auto pb-2">
      <div ref={box} className="relative mx-auto w-max min-w-full px-2">
        <svg className="pointer-events-none absolute left-0 top-0" width={paths.w} height={paths.h} aria-hidden="true">
          {paths.lines.map((d, i) => <path key={i} d={d} className={`thread ${animate ? 'thread-draw' : ''}`} style={animate ? { animationDelay: `${0.25 + i * 0.12}s` } : undefined} />)}
        </svg>
        <div className="relative space-y-12">
          {rows.map((row, i) => (
            <div key={row.level}>
              {labels && <p className="mb-3 text-center text-xs font-medium text-ink-soft">Generation {i + 1}</p>}
              <div className="flex justify-center gap-3 sm:gap-6">
                {row.units.map((unit) => (
                  <div key={unit[0].id} className="flex gap-5 sm:gap-8">
                    {unit.map((p) => <Node key={p.id} person={p} linkTo={linkTo} />)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
