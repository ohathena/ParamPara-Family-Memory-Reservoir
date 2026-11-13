import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useToast } from '../components/Toast'
import { BackLink, ErrorBox, Loading } from '../components/ui'

export default function FamilyForm() {
  const { id } = useParams() // present when editing
  const navigate = useNavigate()
  const toast = useToast()
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
      toast.success(id ? 'Family saved' : 'Family created')
      navigate(`/families/${res.data.family._id}${id ? '' : '/members/new'}`)
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  return (
    <div className="mx-auto max-w-lg">
      <BackLink to={id ? `/families/${id}` : '/dashboard'}>{id ? 'Back to the family' : 'My families'}</BackLink>
      <h1 className="page-title">{id ? 'Edit family' : 'Create a family'}</h1>
      {!id && <p className="mt-1 text-ink-soft">Next you will add the first people to your tree.</p>}
      <form onSubmit={submit} className="sheet-pad mt-6 space-y-4">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="name">Family name</label>
          <input id="name" className="input" required maxLength={100} placeholder="The Sharma Family" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="desc">About this family <span className="font-normal text-ink-soft">(optional)</span></label>
          <textarea id="desc" className="input" rows="3" maxLength={1000} placeholder="Where you are from, what ties you together" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Saving...' : id ? 'Save changes' : 'Create family'}</button>
      </form>
    </div>
  )
}
