import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../AuthContext'
import { Empty, ErrorBox, Loading } from '../components/ui'

const REL_TYPES = ['parent', 'child', 'spouse', 'sibling']

export default function FamilyPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [family, setFamily] = useState(null)
  const [members, setMembers] = useState([])
  const [relationships, setRelationships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rel, setRel] = useState({ source: '', type: 'parent', target: '' })
  const [email, setEmail] = useState('')

  const load = useCallback(async () => {
    try {
      const [f, m] = await Promise.all([api.get(`/families/${id}`), api.get(`/families/${id}/members`)])
      setFamily(f.data.family)
      setMembers(m.data.members)
      // backend lists relationships per member, so fetch each and remove duplicates
      const all = await Promise.all(m.data.members.map((x) => api.get(`/members/${x._id}/relationships`)))
      const map = new Map()
      all.forEach((r) => r.data.relationships.forEach((x) => map.set(x._id, x)))
      setRelationships([...map.values()])
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // run an API action, then show a message and refresh
  const run = async (action, successMsg) => {
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(successMsg)
      await load()
    } catch (err) {
      setError(errMsg(err))
    }
  }

  if (loading) return <Loading />
  if (!family) return <ErrorBox message={error || 'Family not found'} />

  const isOwner = family.owner === user.id

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-forest">{family.name}</h1>
          <p className="text-ink/70">{family.description}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/families/${id}/memories`} className="btn">Memories</Link>
          {isOwner && <Link to={`/families/${id}/edit`} className="btn-light">Edit</Link>}
          {isOwner && (
            <button className="btn-danger" onClick={async () => {
              if (!confirm('Delete this family and ALL its members and memories?')) return
              try { await api.delete(`/families/${id}`); navigate('/dashboard') } catch (err) { setError(errMsg(err)) }
            }}>Delete</button>
          )}
        </div>
      </div>

      <ErrorBox message={error} />
      {notice && <p className="rounded-lg border border-forest bg-forest/10 px-3 py-2 text-sm text-forest">{notice}</p>}

      {/* MEMBERS */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Family members</h2>
          <Link to={`/families/${id}/members/new`} className="btn">+ Add member</Link>
        </div>
        {members.length === 0 ? <Empty>No family members yet. Add the first one.</Empty> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div key={m._id} className="card">
                <h3 className="font-bold">{m.name}</h3>
                {m.birthDate && <p className="text-xs text-ink/60">Born {new Date(m.birthDate).toLocaleDateString()}</p>}
                <p className="mt-1 text-sm text-ink/70">{m.bio}</p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/members/${m._id}/edit`} className="btn-light">Edit</Link>
                  <button className="btn-danger" onClick={() => {
                    if (confirm(`Delete ${m.name}? Their relationships will be removed too.`)) run(() => api.delete(`/members/${m._id}`), 'Member deleted')
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* RELATIONSHIPS */}
      <section>
        <h2 className="mb-3 text-xl font-bold">Relationships</h2>
        {members.length < 2 ? <Empty>Add at least two members to create a relationship.</Empty> : (
          <form className="card mb-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => { e.preventDefault(); run(() => api.post('/relationships', rel), 'Relationship added'); }}>
            <div>
              <label className="label">Person</label>
              <select className="input" required value={rel.source} onChange={(e) => setRel({ ...rel, source: e.target.value })}>
                <option value="">Choose...</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">is the ... of</label>
              <select className="input" value={rel.type} onChange={(e) => setRel({ ...rel, type: e.target.value })}>
                {REL_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Person</label>
              <select className="input" required value={rel.target} onChange={(e) => setRel({ ...rel, target: e.target.value })}>
                <option value="">Choose...</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <button className="btn">Add</button>
          </form>
        )}
        {relationships.length === 0 ? <Empty>No relationships yet.</Empty> : (
          <ul className="space-y-2">
            {relationships.map((r) => (
              <li key={r._id} className="card flex items-center justify-between py-3">
                <span><b>{r.source?.name}</b> is the {r.type} of <b>{r.target?.name}</b></span>
                <button className="btn-danger" onClick={() => run(() => api.delete(`/relationships/${r._id}`), 'Relationship removed')}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* COLLABORATORS */}
      <section>
        <h2 className="mb-3 text-xl font-bold">People with access</h2>
        <ul className="mb-3 space-y-2">
          <li className="card py-3 text-sm">You{isOwner ? ' (owner)' : ''}</li>
          {family.collaborators.map((c) => (
            <li key={c._id} className="card flex items-center justify-between py-3 text-sm">
              <span>{c.name} ({c.email})</span>
              {isOwner && <button className="btn-danger" onClick={() => run(() => api.delete(`/families/${id}/collaborators/${c._id}`), 'Collaborator removed')}>Remove</button>}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/families/${id}/collaborators`, { email }), 'Collaborator added'); setEmail('') }}>
            <input className="input max-w-xs" type="email" required placeholder="Email of a registered user" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn">Invite</button>
          </form>
        )}
      </section>
    </div>
  )
}
