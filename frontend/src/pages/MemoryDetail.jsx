import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../AuthContext'
import { ErrorBox, Loading } from '../components/ui'

export default function MemoryDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [memory, setMemory] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/memories/${id}`)
        const m = res.data.memory
        setMemory(m)
        // author or family owner can edit/delete (same rule as the backend)
        const fam = await api.get(`/families/${m.family}`)
        setCanEdit(m.author._id === user.id || fam.data.family.owner === user.id)
      } catch (err) {
        setError(errMsg(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user.id])

  const remove = async () => {
    if (!confirm('Delete this memory?')) return
    try {
      await api.delete(`/memories/${id}`)
      navigate(`/families/${memory.family}/memories`)
    } catch (err) {
      setError(errMsg(err))
    }
  }

  if (loading) return <Loading />
  if (!memory) return <ErrorBox message={error || 'Memory not found'} />

  return (
    <article className="card mx-auto max-w-2xl">
      <Link to={`/families/${memory.family}/memories`} className="text-sm text-forest underline">← All memories</Link>
      <ErrorBox message={error} />
      <p className="mt-3 text-xs font-medium text-terracotta">{memory.category}</p>
      <h1 className="mb-2 text-3xl font-bold">{memory.title}</h1>
      <p className="mb-4 text-sm text-ink/60">
        By {memory.author?.name}
        {memory.eventDate && ` · ${new Date(memory.eventDate).toLocaleDateString()}`}
        {memory.location && ` · ${memory.location}`}
      </p>
      {memory.mediaUrl && <img src={memory.mediaUrl} alt={memory.title} className="mb-4 max-h-96 rounded-xl" />}
      <p className="whitespace-pre-wrap leading-relaxed">{memory.content}</p>
      {memory.people.length > 0 && (
        <p className="mt-5 text-sm"><b>In this memory:</b> {memory.people.map((p) => p.name).join(', ')}</p>
      )}
      {canEdit && (
        <div className="mt-6 flex gap-2">
          <Link to={`/memories/${id}/edit`} className="btn-light">Edit</Link>
          <button className="btn-danger" onClick={remove}>Delete</button>
        </div>
      )}
    </article>
  )
}
