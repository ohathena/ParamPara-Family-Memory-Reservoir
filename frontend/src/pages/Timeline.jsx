import { Link, useOutletContext } from 'react-router-dom'
import { useGet } from '../hooks/useGet'
import { CategoryTag, Empty, ErrorBox, Loading } from '../components/ui'
import { fmtDate, img } from '../utils'

export default function Timeline() {
  const { family, canWrite } = useOutletContext()
  const { data, loading, error } = useGet(`/families/${family._id}/timeline`, { limit: 200 })

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (data.count === 0) {
    return <Empty title="No dated memories yet" action={canWrite && <Link to="../memories/new" className="btn">Write a memory</Link>}>Give a memory an event date and it appears here, in the order it happened.</Empty>
  }

  return (
    <ol className="relative">
      {data.years.map((y) => (
        <li key={y.year} className="grid gap-x-6 sm:grid-cols-[96px_1fr]">
          <h2 className="font-display pt-3 text-[1.7rem] leading-none text-kumkum sm:text-right">{y.year}</h2>
          <div className="relative space-y-3 border-l-2 border-marigold/50 pb-8 pl-6 pt-3">
            <span className="absolute -left-[7px] top-[18px] h-3 w-3 rounded-full border-2 border-paper bg-marigold" aria-hidden="true" />
            {y.memories.map((m) => (
              <Link key={m._id} to={`/memories/${m._id}`} className="sheet hoverable flex gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3"><CategoryTag category={m.category} /><span className="text-xs text-ink-soft">{fmtDate(m.eventDate)}{m.location && `, ${m.location}`}</span></div>
                  <p className="font-display mt-1 text-lg leading-snug">{m.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{m.excerpt}</p>
                </div>
                {m.mediaUrl && <img src={img(m.mediaUrl, 160, 160)} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-[10px] object-cover" />}
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}
