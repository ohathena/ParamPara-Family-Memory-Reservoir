import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { ErrorBox, Loading } from '../components/ui'

export default function FamilyForm() {
  const { id } = useParams() // present when editing
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(!!id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/families/${id}`)
      .then((res) => setForm({ name: res.data.family.name, description: res.data.family.description }))
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false))
  }, [id])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = id ? await api.patch(`/families/${id}`, form) : await api.post('/families', form)
      navigate(`/families/${res.data.family._id}`)
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  return (
    <form onSubmit={submit} className="card mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-forest">{id ? 'Edit family' : 'Create a family'}</h1>
      <ErrorBox message={error} />
      <div>
        <label className="label">Family name</label>
        <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
    </form>
  )
}
