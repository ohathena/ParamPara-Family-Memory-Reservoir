import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../AuthContext'
import { useConfirm } from '../components/Confirm'
import { useToast } from '../components/Toast'
import { useGet } from '../hooks/useGet'
import { Avatar, BackLink, CategoryTag, ErrorBox, Icon, Loading } from '../components/ui'
import { fmtDate, img, timeAgo } from '../utils'

function Comments({ memoryId, isOwner }) {
  const { user } = useAuth()
  const toast = useToast()
  const { data, reload } = useGet(`/memories/${memoryId}/comments`)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const list = data?.comments || []

  const add = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post(`/memories/${memoryId}/comments`, { content: text })
      setText('')
      reload()
    } catch (err) { setError(errMsg(err)) } finally { setBusy(false) }
  }
  const remove = async (c) => {
    try { await api.delete(`/comments/${c._id}`); toast.success('Comment deleted'); reload() } catch (err) { toast.error(errMsg(err)) }
  }

  return (
    <section className="mt-10" aria-labelledby="comments-title">
      <h2 id="comments-title" className="section-title">{list.length ? `${list.length} ${list.length === 1 ? 'comment' : 'comments'}` : 'Comments'}</h2>
      {list.length === 0 && <p className="mb-4 text-sm text-ink-soft">Remember this too? Add what you know.</p>}
      <ul className="space-y-4">
        {list.map((c) => (
          <li key={c._id} className="group flex gap-3">
            <Avatar name={c.author?.name || '?'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm"><b>{c.author?.name || 'Former member'}</b> <span className="text-ink-soft">{timeAgo(c.createdAt)}</span></p>
              <p className="mt-0.5 whitespace-pre-wrap">{c.content}</p>
            </div>
            {(c.author?._id === user.id || isOwner) && (
              <button className="self-start text-ink-soft opacity-60 hover:text-kumkum hover:opacity-100 focus-visible:opacity-100" onClick={() => remove(c)} aria-label="Delete comment"><Icon name="trash" className="h-4 w-4" /></button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-5 flex gap-3">
        <Avatar name={user.name} size="sm" />
        <div className="flex-1">
          <ErrorBox message={error} />
          <textarea className="input" rows="2" required maxLength={2000} placeholder="Add a comment" value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add(e) }} aria-label="Comment" />
          <div className="mt-2 flex justify-end"><button className="btn btn-sm" disabled={busy || !text.trim()}>{busy ? 'Posting...' : 'Post comment'}</button></div>
        </div>
      </form>
    </section>
  )
}

export default function MemoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { data, loading, error } = useGet(`/memories/${id}`)

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />
  const { memory, canEdit, role } = data

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this memory?', body: `"${memory.title}" and its comments will be gone for everyone in the family.`, action: 'Delete memory' }))) return
    try {
      await api.delete(`/memories/${id}`)
      toast.success('Memory deleted')
      navigate(`/families/${memory.family}/memories`)
    } catch (err) { toast.error(errMsg(err)) }
  }

  return (
    <article className="mx-auto max-w-[720px]">
      <BackLink to={`/families/${memory.family}/memories`}>All memories</BackLink>
      <CategoryTag category={memory.category} />
      <h1 className="font-display mt-1 text-[2.2rem] leading-[1.1] sm:text-[2.8rem]">{memory.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
        <span>Written by <b className="text-ink">{memory.author?.name || 'a former member'}</b></span>
        {memory.eventDate && <span className="flex items-center gap-1"><Icon name="clock" className="h-4 w-4" />{fmtDate(memory.eventDate)}</span>}
        {memory.location && <span className="flex items-center gap-1"><Icon name="pin" className="h-4 w-4" />{memory.location}</span>}
      </div>

      {memory.mediaUrl && (
        <a href={memory.mediaUrl} target="_blank" rel="noreferrer noopener" className="mt-6 block overflow-hidden rounded-[14px] border border-line bg-line-soft">
          <img src={img(memory.mediaUrl, 1400)} alt={memory.title} className="max-h-[560px] w-full object-contain" />
        </a>
      )}

      <div className="prose-memory mt-7">{memory.content}</div>

      {memory.people.length > 0 && (
        <div className="mt-8 border-t border-line pt-5">
          <p className="mb-2.5 text-sm font-medium text-ink-soft">In this memory</p>
          <div className="flex flex-wrap gap-2">
            {memory.people.map((p) => (
              <Link key={p._id} to={`/members/${p._id}`} className="flex items-center gap-2 rounded-full border border-line bg-sheet py-1 pl-1 pr-3 text-sm hover:border-ink/25">
                <Avatar name={p.name} photo={p.photoUrl} size="xs" /> {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <div className="mt-6 flex gap-2">
          <Link to={`/memories/${id}/edit`} className="btn-quiet btn-sm"><Icon name="edit" className="h-4 w-4" /> Edit</Link>
          <button className="btn-quiet btn-sm hover:text-kumkum" onClick={remove}><Icon name="trash" className="h-4 w-4" /> Delete</button>
        </div>
      )}

      <Comments memoryId={id} isOwner={role === 'owner'} />
    </article>
  )
}
