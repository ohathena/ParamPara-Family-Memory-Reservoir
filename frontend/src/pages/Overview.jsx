import { Link, useOutletContext } from 'react-router-dom'
import { useGet } from '../hooks/useGet'
import { Avatar, CategoryTag, Empty, ErrorBox, Icon } from '../components/ui'
import { CATEGORY_DOT } from '../constants'
import { fmtDate, img, timeAgo } from '../utils'

// one line per feed entry, in plain words
const describe = (a) => ({
  'family.created': <>created the family</>,
  'member.added': <>added <b>{a.subjectLabel}</b> to the tree</>,
  'memory.created': <>wrote <Link className="link" to={`/memories/${a.subjectId}`}>{a.subjectLabel}</Link></>,
  'comment.added': <>commented on <Link className="link" to={`/memories/${a.subjectId}`}>{a.subjectLabel}</Link></>,
  'person.joined': <>joined as {a.subjectLabel || 'editor'}</>,
})[a.action]

export default function Overview() {
  const { family, canWrite } = useOutletContext()
  const stats = useGet(`/families/${family._id}/stats`)
  const recent = useGet('/memories', { family: family._id, limit: 4 })
  const feed = useGet(`/families/${family._id}/activity`, { limit: 8 })
  const s = stats.data?.stats
  const cats = s ? Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]) : []
  const max = Math.max(1, ...cats.map((c) => c[1]))

  const facts = s && [
    [s.members, s.members === 1 ? 'person in the tree' : 'people in the tree', 'members'],
    [s.memories, s.memories === 1 ? 'memory' : 'memories', 'memories'],
    [s.comments, s.comments === 1 ? 'comment' : 'comments', 'memories'],
    [s.yearsCovered ? `${s.yearsCovered.from}–${s.yearsCovered.to}` : '—', 'years covered', 'timeline'],
  ]

  return (
    <div className="space-y-10">
      <ErrorBox message={stats.error} />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-4">
        {(facts || Array(4).fill(['', '', ''])).map(([value, label, to], i) => (
          <Link key={i} to={to || ''} className="bg-sheet px-5 py-4 hover:bg-paper">
            <p className="font-display text-[1.9rem] leading-tight text-ink">{s ? value : <span className="skeleton inline-block h-7 w-10" />}</p>
            <p className="text-sm text-ink-soft">{label}</p>
          </Link>
        ))}
      </div>

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <Link to="memories/new" className="btn"><Icon name="edit" className="h-4 w-4" /> Write a memory</Link>
          <Link to="members/new" className="btn-quiet"><Icon name="plus" className="h-4 w-4" /> Add a person</Link>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="section-title !mb-0">Latest memories</h2>
            {recent.data?.total > 4 && <Link to="memories" className="link text-sm">See all {recent.data.total}</Link>}
          </div>
          {recent.data?.memories.length === 0 ? (
            <Empty title="No memories yet" action={canWrite && <Link to="memories/new" className="btn">Write the first one</Link>}>A recipe, a wedding, a story Dadi tells. Start with one.</Empty>
          ) : (
            <div className="divide-y divide-line-soft rounded-[14px] border border-line bg-sheet">
              {recent.data?.memories.map((m) => (
                <Link key={m._id} to={`/memories/${m._id}`} className="flex gap-4 p-4 hover:bg-paper">
                  {m.mediaUrl && <img src={img(m.mediaUrl, 128, 128)} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-[10px] object-cover" />}
                  <div className="min-w-0">
                    <CategoryTag category={m.category} />
                    <p className="font-display mt-0.5 truncate text-lg leading-snug">{m.title}</p>
                    <p className="text-xs text-ink-soft">{m.author?.name || 'Former member'}{m.eventDate && `, ${fmtDate(m.eventDate)}`}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="section-title">Recent activity</h2>
          {feed.data?.activity.length ? (
            <ol className="space-y-4">
              {feed.data.activity.map((a) => (
                <li key={a._id} className="flex gap-3 text-sm">
                  <Avatar name={a.actorName || '?'} size="sm" />
                  <div className="min-w-0 pt-0.5">
                    <p><b>{a.actorName || 'Someone'}</b> {describe(a)}</p>
                    <p className="text-xs text-ink-soft">{timeAgo(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : feed.loading ? null : <p className="text-sm text-ink-soft">Nothing yet.</p>}
        </section>
      </div>

      {cats.length > 0 && (
        <section>
          <h2 className="section-title">What the family has saved</h2>
          <div className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {cats.map(([cat, n]) => (
              <Link key={cat} to={`memories?category=${encodeURIComponent(cat)}`} className="group block">
                <div className="mb-1 flex justify-between text-sm"><span className="group-hover:text-kumkum">{cat}</span><span className="text-ink-soft">{n}</span></div>
                <div className="h-1.5 rounded-full bg-line-soft"><div className="h-1.5 rounded-full" style={{ width: `${(n / max) * 100}%`, background: CATEGORY_DOT[cat] }} /></div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
