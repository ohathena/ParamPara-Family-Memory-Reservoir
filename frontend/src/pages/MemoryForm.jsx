import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import PhotoInput from '../components/PhotoInput'
import { useToast } from '../components/Toast'
import { Avatar, BackLink, ErrorBox, Loading } from '../components/ui'
import { CATEGORIES } from '../constants'
import { dateInput } from '../utils'

const PROMPTS = {
  Story: 'What happened? Who was there? What do people still say about it?',
  Recipe: 'Ingredients, steps, and the trick that makes it taste like home.',
  Photograph: 'Who is in the photo, where and when it was taken, and the story behind it.',
  Letter: 'Type out the letter, or describe who wrote it to whom, and why it matters.',
  'Family event': 'A wedding, a birth, a move, a reunion. Tell it as you remember it.',
  Tradition: 'What the family does, when, and how it started.',
  Achievement: 'What was achieved, by whom, and what it took.',
  Other: 'Write it the way you would tell it.',
}

// Route /families/:id/memories/new -> id is the family id (add)
// Route /memories/:id/edit         -> id is the memory id (edit)
export default function MemoryForm() {
  const { id } = useParams()
  const editing = useLocation().pathname.startsWith('/memories/')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [familyId, setFamilyId] = useState(editing ? null : id)
  const [members, setMembers] = useState([])
  const [form, setForm] = useState({ title: '', content: '', category: 'Story', eventDate: '', location: '', mediaUrl: '', people: searchParams.get('person') ? [searchParams.get('person')] : [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        let fid = id
        if (editing) {
          const m = (await api.get(`/memories/${id}`)).data.memory
          fid = m.family
          setFamilyId(fid)
          setForm({ title: m.title, content: m.content, category: m.category, eventDate: dateInput(m.eventDate), location: m.location, mediaUrl: m.mediaUrl, people: m.people.map((p) => p._id) })
        }
        setMembers((await api.get(`/families/${fid}/members`)).data.members)
      } catch (err) {
        setError(errMsg(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, editing])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const togglePerson = (pid) => setForm({ ...form, people: form.people.includes(pid) ? form.people.filter((x) => x !== pid) : [...form.people, pid] })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = { ...form, eventDate: form.eventDate || null }
      const res = editing ? await api.patch(`/memories/${id}`, body) : await api.post('/memories', { ...body, family: familyId })
      toast.success(editing ? 'Memory saved' : 'Memory added to the family record')
      navigate(`/memories/${res.data.memory._id}`)
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to={editing ? `/memories/${id}` : `/families/${familyId}/memories`}>{editing ? 'Back to the memory' : 'All memories'}</BackLink>
      <h1 className="page-title">{editing ? 'Edit memory' : 'Write a memory'}</h1>
      <form onSubmit={submit} className="sheet-pad mt-6 space-y-5">
        <ErrorBox message={error} />
        <fieldset>
          <legend className="label">What kind of memory?</legend>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <label key={c} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-kumkum/25 ${form.category === c ? 'border-ink bg-ink text-white' : 'border-line bg-sheet hover:border-ink/30'}`}>
                <input type="radio" name="category" value={c} className="sr-only" checked={form.category === c} onChange={set('category')} /> {c}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input !text-lg" required maxLength={150} placeholder="Dadi's siddu recipe" value={form.title} onChange={set('title')} />
        </div>
        <div>
          <label className="label" htmlFor="content">The memory</label>
          <textarea id="content" className="input min-h-[220px] leading-relaxed" required maxLength={20000} placeholder={PROMPTS[form.category]} value={form.content} onChange={set('content')} />
          <p className="hint text-right">{form.content.length.toLocaleString()} / 20,000</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="date">When it happened <span className="font-normal text-ink-soft">(optional)</span></label>
            <input id="date" className="input" type="date" value={form.eventDate} onChange={set('eventDate')} />
            <p className="hint">Dated memories appear on the timeline.</p>
          </div>
          <div>
            <label className="label" htmlFor="loc">Where <span className="font-normal text-ink-soft">(optional)</span></label>
            <input id="loc" className="input" maxLength={150} placeholder="Village, city or house" value={form.location} onChange={set('location')} />
          </div>
        </div>
        {familyId && <PhotoInput familyId={familyId} value={form.mediaUrl} onChange={(mediaUrl) => setForm((f) => ({ ...f, mediaUrl }))} />}
        <fieldset>
          <legend className="label">Who is in this memory?</legend>
          {members.length === 0 ? <p className="text-sm text-ink-soft">Add people to the family first, then you can tag them here.</p> : (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = form.people.includes(m._id)
                return (
                  <label key={m._id} className={`flex cursor-pointer items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-kumkum/25 ${on ? 'border-kumkum bg-kumkum-tint text-kumkum-dark' : 'border-line bg-sheet hover:border-ink/30'}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => togglePerson(m._id)} />
                    <Avatar name={m.name} photo={m.photoUrl} size="xs" /> {m.name}
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>
        <div className="border-t border-line-soft pt-5">
          <button className="btn" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Save memory'}</button>
        </div>
      </form>
    </div>
  )
}
