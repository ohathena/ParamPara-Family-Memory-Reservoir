import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useGet } from '../hooks/useGet'
import { Empty, ErrorBox, Icon, Loading, RoleTag } from '../components/ui'

export default function Dashboard() {
  const { user } = useAuth()
  const { data, loading, error } = useGet('/families')
  const families = data?.families || []

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-ink-soft">Namaste, {user.name.split(' ')[0]}</p>
          <h1 className="page-title">Your families</h1>
        </div>
        <Link to="/families/new" className="btn"><Icon name="plus" className="h-4 w-4" /> New family</Link>
      </div>
      <ErrorBox message={error} />
      {loading && !data ? <Loading /> : families.length === 0 && !error ? (
        <Empty title="No family record yet" action={<Link to="/families/new" className="btn">Create your family</Link>}>
          A family record holds your tree, your memories and the people you share them with. If a relative invited you, open their link.
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {families.map((f) => (
            <Link key={f._id} to={`/families/${f._id}`} className="sheet-pad hoverable group flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-[1.6rem] leading-tight group-hover:text-kumkum">{f.name}</h2>
                <RoleTag role={f.role} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{f.description || 'No description yet'}</p>
              <dl className="mt-5 flex gap-6 border-t border-line-soft pt-4 text-sm">
                <div><dt className="text-ink-soft">People</dt><dd className="font-semibold">{f.memberCount}</dd></div>
                <div><dt className="text-ink-soft">Memories</dt><dd className="font-semibold">{f.memoryCount}</dd></div>
                <div><dt className="text-ink-soft">Shared with</dt><dd className="font-semibold">{f.peopleWithAccess} {f.peopleWithAccess === 1 ? 'person' : 'people'}</dd></div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
