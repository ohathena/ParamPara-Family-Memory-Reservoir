import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { useGet } from '../hooks/useGet'
import { Avatar, CategoryTag, Empty, ErrorBox, Icon, Loading } from '../components/ui'
import { CATEGORIES } from '../constants'
import { fmtDate, img } from '../utils'

export default function MemoryList() {
  const { family, canWrite } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    person: searchParams.get('person') || '',
    sort: searchParams.get('sort') || 'newest',
    page: Number(searchParams.get('page')) || 1,
  }
  const [search, setSearch] = useState(filters.q) // what is typed; applied after a short pause
  const members = useGet(`/families/${family._id}/members`)

  // filters live in the URL, so back/forward and shared links keep them
  const change = (patch) => {
    const next = { ...filters, page: 1, ...patch }
    setSearchParams(Object.fromEntries(Object.entries(next).filter(([k, v]) => v && !(k === 'sort' && v === 'newest') && !(k === 'page' && v === 1))), { replace: true })
  }

  useEffect(() => {
    if (search === filters.q) return
    const t = setTimeout(() => change({ q: search }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const params = { family: family._id, page: filters.page, limit: 12, sort: filters.sort }
  for (const k of ['category', 'person', 'q']) if (filters[k]) params[k] = filters[k]
  const { data, loading, error } = useGet('/memories', params)
  const person = members.data?.members.find((m) => m._id === filters.person)
  const filtered = filters.q || filters.category || filters.person

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title !mb-0">Memories {data && <span className="font-sans text-base text-ink-soft">({data.total})</span>}</h2>
        {canWrite && <Link to={`new${filters.person ? `?person=${filters.person}` : ''}`} className="btn btn-sm"><Icon name="edit" className="h-4 w-4" /> Write a memory</Link>}
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <label className="relative">
          <span className="sr-only">Search memories</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input className="input !pl-9" placeholder="Search titles and stories" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <select className="input" value={filters.category} onChange={(e) => change({ category: e.target.value })} aria-label="Category">
          <option value="">All kinds</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" value={filters.person} onChange={(e) => change({ person: e.target.value })} aria-label="Person">
          <option value="">Everyone</option>
          {members.data?.members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <select className="input" value={filters.sort} onChange={(e) => change({ sort: e.target.value })} aria-label="Sort">
          <option value="newest">Recently added</option>
          <option value="oldest">First added</option>
          <option value="event">By date it happened</option>
        </select>
      </div>
      {person && <p className="mb-4 flex items-center gap-2 text-sm text-ink-soft"><Avatar name={person.name} photo={person.photoUrl} size="xs" /> Showing memories with {person.name}</p>}

      <ErrorBox message={error} />
      {loading && !data ? <Loading /> : !data || data.memories.length === 0 ? (
        filtered
          ? <Empty title="Nothing matches" action={<button className="btn-quiet" onClick={() => { setSearch(''); setSearchParams({}) }}>Clear filters</button>}>Try a different word, kind or person.</Empty>
          : <Empty title="No memories yet" action={canWrite && <Link to="new" className="btn">Write the first memory</Link>}>A recipe, a letter, the story behind an old photo. Start with one.</Empty>
      ) : (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
            {data.memories.map((m) => (
              <Link key={m._id} to={`/memories/${m._id}`} className="sheet hoverable flex flex-col overflow-hidden">
                {m.mediaUrl && <img src={img(m.mediaUrl, 640, 360)} alt="" loading="lazy" className="aspect-[16/9] w-full bg-line-soft object-cover" />}
                <div className="flex flex-1 flex-col p-4">
                  <CategoryTag category={m.category} />
                  <h3 className="font-display mt-1 text-xl leading-snug">{m.title}</h3>
                  {!m.mediaUrl && <p className="mt-1.5 line-clamp-3 text-sm text-ink-soft">{m.content}</p>}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-ink-soft">
                    <span className="truncate">{m.author?.name || 'Former member'}{m.eventDate && `, ${fmtDate(m.eventDate)}`}</span>
                    {m.commentCount > 0 && <span className="flex shrink-0 items-center gap-1"><Icon name="chat" className="h-3.5 w-3.5" />{m.commentCount}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {data.pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-4 text-sm" aria-label="Pages">
              <button className="btn-quiet btn-sm" disabled={filters.page <= 1} onClick={() => change({ page: filters.page - 1 })}>Previous</button>
              <span className="text-ink-soft">Page {data.page} of {data.pages}</span>
              <button className="btn-quiet btn-sm" disabled={filters.page >= data.pages} onClick={() => change({ page: filters.page + 1 })}>Next</button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
