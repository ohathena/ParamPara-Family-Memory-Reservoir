import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { Empty, ErrorBox, Loading } from '../components/ui'
import { CATEGORIES } from './MemoryForm'

export default function MemoryList() {
  const { id } = useParams() // family id
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ q: '', category: '', sort: 'newest' })
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = { family: id, page, limit: 6, sort: filters.sort }
    if (filters.category) params.category = filters.category
    if (filters.q) params.q = filters.q
    api.get('/memories', { params })
      .then((res) => { setData(res.data); setError('') })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false))
  }, [id, page, filters])

  const change = (key, value) => { setPage(1); setFilters({ ...filters, [key]: value }) }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/families/${id}`} className="text-sm text-forest underline">← Back to family</Link>
          <h1 className="text-2xl font-bold text-forest">Memories</h1>
        </div>
        <Link to={`/families/${id}/memories/new`} className="btn">+ New memory</Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search..." value={filters.q} onChange={(e) => change('q', e.target.value)} />
        <select className="input max-w-[180px]" value={filters.category} onChange={(e) => change('category', e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input max-w-[180px]" value={filters.sort} onChange={(e) => change('sort', e.target.value)}>
          <option value="newest">Newest added</option>
          <option value="oldest">Oldest added</option>
          <option value="event">By event date</option>
        </select>
      </div>

      <ErrorBox message={error} />
      {loading ? <Loading /> : !data || data.memories.length === 0 ? (
        <Empty>No memories found. Write the first one!</Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.memories.map((m) => (
              <Link key={m._id} to={`/memories/${m._id}`} className="card block hover:border-forest">
                <span className="text-xs font-medium text-terracotta">{m.category}</span>
                <h2 className="text-lg font-bold">{m.title}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-ink/70">{m.content}</p>
                <p className="mt-3 text-xs text-ink/50">
                  by {m.author?.name}{m.eventDate && ` · ${new Date(m.eventDate).toLocaleDateString()}`}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <button className="btn-light" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {data.page} of {data.pages}</span>
            <button className="btn-light" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}
