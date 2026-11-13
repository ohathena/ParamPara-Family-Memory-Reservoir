import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { useGet } from '../hooks/useGet'
import { ErrorBox, Loading, RoleTag } from '../components/ui'

const TABS = [
  ['', 'Overview', true],
  ['tree', 'Tree'],
  ['memories', 'Memories'],
  ['members', 'People'],
  ['timeline', 'Timeline'],
  ['access', 'Sharing'],
]

// Shared frame for every page inside one family: loads the family once and gives it to the pages below
export default function FamilyLayout() {
  const { id } = useParams()
  const { data, loading, error, reload } = useGet(`/families/${id}`)

  if (loading && !data) return <Loading />
  if (error) return <div><ErrorBox message={error} /><Link to="/dashboard" className="btn-quiet">Back to my families</Link></div>

  const family = data.family
  const role = family.role
  const isOwner = role === 'owner'
  const canWrite = role === 'owner' || role === 'editor'

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title truncate">{family.name}</h1>
            <RoleTag role={role} />
          </div>
          {family.description && <p className="mt-1 max-w-[70ch] text-ink-soft">{family.description}</p>}
        </div>
        {isOwner && <Link to={`/families/${id}/edit`} className="btn-quiet btn-sm">Edit details</Link>}
      </div>

      <nav className="-mx-4 mb-7 mt-4 flex overflow-x-auto border-b border-line px-1 sm:mx-0 sm:px-0" aria-label="Family sections">
        {TABS.map(([path, label, end]) => (
          <NavLink key={label} to={path} end={end} className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}>{label}</NavLink>
        ))}
      </nav>

      {role === 'viewer' && (
        <p className="mb-6 rounded-[10px] bg-line-soft px-4 py-2.5 text-sm text-ink-soft">You can read everything here and leave comments. Ask the owner if you want to add memories too.</p>
      )}

      <Outlet context={{ family, role, isOwner, canWrite, reloadFamily: reload }} />
    </div>
  )
}
