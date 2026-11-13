import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import api, { errMsg } from '../api'
import { ErrorBox, Loading } from '../components/ui'

// Route /families/:id/members/new  -> id is the family id (add)
// Route /members/:id/edit          -> id is the member id (edit)
export default function MemberForm() {
  const { id } = useParams()
  const editing = useLocation().pathname.startsWith('/members/')
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', birthDate: '', bio: '' })
  const [familyId, setFamilyId] = useState(editing ? null : id)
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    api.get(`/members/${id}`)
      .then((res) => {
        const m = res.data.member
        setFamilyId(m.family)
        setForm({ name: m.name, birthDate: m.birthDate ? m.birthDate.slice(0, 10) : '', bio: m.bio })
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false))
  }, [id, editing])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = { name: form.name, bio: form.bio }
      if (form.birthDate) body.birthDate = form.birthDate
      if (editing) await api.patch(`/members/${id}`, body)
      else await api.post(`/families/${id}/members`, body)
      navigate(`/families/${familyId}`)
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  return (
    <form onSubmit={submit} className="card mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-forest">{editing ? 'Edit family member' : 'Add a family member'}</h1>
      <ErrorBox message={error} />
      <div>
        <label className="label">Name</label>
        <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="label">Birth date (optional)</label>
        <input className="input" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
      </div>
      <div>
        <label className="label">About them (optional)</label>
        <textarea className="input" rows="4" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>
      <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
    </form>
  )
}
