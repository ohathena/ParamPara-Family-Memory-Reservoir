import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { ErrorBox, Loading } from '../components/ui'

export const CATEGORIES = ['Story', 'Recipe', 'Photograph', 'Letter', 'Family event', 'Tradition', 'Achievement', 'Other']

// Route /families/:id/memories/new -> id is the family id (add)
// Route /memories/:id/edit         -> id is the memory id (edit)
export default function MemoryForm() {
  const { id } = useParams()
  const editing = useLocation().pathname.startsWith('/memories/')
  const navigate = useNavigate()
  const [familyId, setFamilyId] = useState(editing ? null : id)
  const [members, setMembers] = useState([])
  const [form, setForm] = useState({ title: '', content: '', category: 'Story', eventDate: '', location: '', mediaUrl: '', people: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        let fid = id
        if (editing) {
          const res = await api.get(`/memories/${id}`)
          const m = res.data.memory
          fid = m.family
          setForm({
            title: m.title, content: m.content, category: m.category,
            eventDate: m.eventDate ? m.eventDate.slice(0, 10) : '',
            location: m.location, mediaUrl: m.mediaUrl,
            people: m.people.map((p) => p._id),
          })
          setFamilyId(fid)
        }
        const mem = await api.get(`/families/${fid}/members`)
        setMembers(mem.data.members)
      } catch (err) {
        setError(errMsg(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, editing])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const togglePerson = (pid) =>
    setForm({ ...form, people: form.people.includes(pid) ? form.people.filter((x) => x !== pid) : [...form.people, pid] })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = { ...form }
      if (!body.eventDate) delete body.eventDate
      let res
      if (editing) res = await api.patch(`/memories/${id}`, body)
      else res = await api.post('/memories', { ...body, family: familyId })
      navigate(`/memories/${res.data.memory._id}`)
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  return (
    <form onSubmit={submit} className="card mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-forest">{editing ? 'Edit memory' : 'Write a memory'}</h1>
      <ErrorBox message={error} />
      <div>
        <label className="label">Title</label>
        <input className="input" required value={form.title} onChange={set('title')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Event date (optional)</label>
          <input className="input" type="date" value={form.eventDate} onChange={set('eventDate')} />
        </div>
      </div>
      <div>
        <label className="label">Story / content</label>
        <textarea className="input" rows="8" required value={form.content} onChange={set('content')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Location (optional)</label>
          <input className="input" value={form.location} onChange={set('location')} />
        </div>
        <div>
          <label className="label">Photo link (optional)</label>
          <input className="input" type="url" placeholder="https://..." value={form.mediaUrl} onChange={set('mediaUrl')} />
        </div>
      </div>
      <div>
        <label className="label">Who is in this memory?</label>
        {members.length === 0 ? <p className="text-sm text-ink/60">No family members added yet.</p> : (
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <label key={m._id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={form.people.includes(m._id)} onChange={() => togglePerson(m._id)} /> {m.name}
              </label>
            ))}
          </div>
        )}
      </div>
      <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save memory'}</button>
    </form>
  )
}
