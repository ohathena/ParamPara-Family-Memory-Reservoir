import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import PhotoInput from '../components/PhotoInput'
import { useToast } from '../components/Toast'
import { BackLink, ErrorBox, Loading } from '../components/ui'
import { dateInput } from '../utils'

const EMPTY = { name: '', nickname: '', gender: '', birthDate: '', deathDate: '', birthPlace: '', photoUrl: '', bio: '' }

// Route /families/:id/members/new -> id is the family id (add)
// Route /members/:id/edit         -> id is the member id (edit)
export default function MemberForm() {
  const { id } = useParams()
  const editing = useLocation().pathname.startsWith('/members/')
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [familyId, setFamilyId] = useState(editing ? null : id)
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    if (!editing) return
    api.get(`/members/${id}`)
      .then((res) => {
        const m = res.data.member
        setFamilyId(m.family)
        setForm({ ...EMPTY, ...m, birthDate: dateInput(m.birthDate), deathDate: dateInput(m.deathDate) })
        setPassed(!!m.deathDate)
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false))
  }, [id, editing])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (addAnother) => {
    setBusy(true)
    setError('')
    const body = { ...form, deathDate: passed ? form.deathDate || null : null, birthDate: form.birthDate || null }
    for (const k of ['_id', 'family', 'user', 'createdAt', 'updatedAt', '__v']) delete body[k]
    try {
      let saved
      if (editing) saved = (await api.patch(`/members/${id}`, body)).data.member
      else {
        if (!body.birthDate) delete body.birthDate
        if (!body.deathDate) delete body.deathDate
        saved = (await api.post(`/families/${id}/members`, body)).data.member
      }
      toast.success(editing ? 'Changes saved' : `${saved.name} added`)
      if (addAnother) { setForm(EMPTY); setPassed(false); setBusy(false); window.scrollTo(0, 0) }
      else navigate(`/members/${saved._id}`)
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to={editing ? `/members/${id}` : `/families/${familyId}/members`}>{editing ? 'Back to profile' : 'Everyone in the family'}</BackLink>
      <h1 className="page-title">{editing ? `Edit ${form.name || 'person'}` : 'Add a person'}</h1>
      {!editing && <p className="mt-1 text-ink-soft">Only the name is needed. You can fill in the rest later.</p>}
      <form onSubmit={(e) => { e.preventDefault(); submit(false) }} className="sheet-pad mt-6 space-y-5">
        <ErrorBox message={error} />
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" required maxLength={100} value={form.name} onChange={set('name')} autoFocus={!editing} />
          </div>
          <div>
            <label className="label" htmlFor="nick">Called <span className="font-normal text-ink-soft">(optional)</span></label>
            <input id="nick" className="input" maxLength={60} placeholder="Dadi, Bade Papa" value={form.nickname} onChange={set('nickname')} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="gender">Gender</label>
            <select id="gender" className="input" value={form.gender} onChange={set('gender')}>
              <option value="">Not set</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="birth">Birth date</label>
            <input id="birth" className="input" type="date" value={form.birthDate} onChange={set('birthDate')} />
          </div>
          <div>
            <label className="label" htmlFor="place">Birthplace</label>
            <input id="place" className="input" maxLength={150} placeholder="Village or city" value={form.birthPlace} onChange={set('birthPlace')} />
          </div>
        </div>
        <div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-kumkum" checked={passed} onChange={(e) => setPassed(e.target.checked)} /> Has passed away
          </label>
          {passed && (
            <div className="mt-3 max-w-[200px]">
              <label className="label" htmlFor="death">Date of passing <span className="font-normal text-ink-soft">(optional)</span></label>
              <input id="death" className="input" type="date" min={form.birthDate || undefined} value={form.deathDate} onChange={set('deathDate')} />
            </div>
          )}
        </div>
        {familyId && <PhotoInput familyId={familyId} value={form.photoUrl} onChange={(photoUrl) => setForm((f) => ({ ...f, photoUrl }))} round />}
        <div>
          <label className="label" htmlFor="bio">About them <span className="font-normal text-ink-soft">(optional)</span></label>
          <textarea id="bio" className="input" rows="4" maxLength={2000} placeholder="What they did, what they were known for, a habit everyone remembers" value={form.bio} onChange={set('bio')} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line-soft pt-5">
          <button className="btn" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add person'}</button>
          {!editing && <button type="button" className="btn-quiet" disabled={busy || !form.name.trim()} onClick={() => submit(true)}>Add and add another</button>}
        </div>
      </form>
    </div>
  )
}
