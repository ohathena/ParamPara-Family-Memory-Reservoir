import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useConfirm } from '../components/Confirm'
import { useToast } from '../components/Toast'
import { useGet } from '../hooks/useGet'
import { Avatar, BackLink, CategoryTag, ErrorBox, Icon, Loading } from '../components/ui'
import { fmtDate, img, relationTo } from '../utils'

export default function MemberProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { data, loading, error } = useGet(`/members/${id}`)
  const familyId = data?.member.family
  const memories = useGet(familyId ? '/memories' : null, { family: familyId, person: id, limit: 12, sort: 'event' })

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />
  const { member: m, relationships, memoryCount, role } = data
  const canWrite = role === 'owner' || role === 'editor'

  const remove = async () => {
    if (!(await confirm({ title: `Remove ${m.name} from the tree?`, body: 'Their relationships are removed too. Memories stay, without this person tagged.', action: 'Remove person' }))) return
    try { await api.delete(`/members/${id}`); toast.success(`${m.name} removed`); navigate(`/families/${familyId}/members`) } catch (err) { toast.error(errMsg(err)) }
  }

  const facts = [
    m.birthDate && ['Born', `${fmtDate(m.birthDate)}${m.birthPlace ? `, ${m.birthPlace}` : ''}`],
    !m.birthDate && m.birthPlace && ['From', m.birthPlace],
    m.deathDate && ['Passed away', fmtDate(m.deathDate)],
  ].filter(Boolean)
  const family = relationships.map((r) => relationTo(id, r)).filter((x) => x.other)

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to={`/families/${familyId}/members`}>Everyone in the family</BackLink>
      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
        <Avatar name={m.name} photo={m.photoUrl} size="xl" deceased={!!m.deathDate} />
        <div className="min-w-0 flex-1">
          {m.nickname && <p className="font-display text-xl text-kumkum">{m.nickname}</p>}
          <h1 className="page-title">{m.name}</h1>
          {facts.length > 0 && (
            <dl className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm sm:justify-start">
              {facts.map(([k, v]) => <div key={k}><dt className="inline text-ink-soft">{k} </dt><dd className="inline font-medium">{v}</dd></div>)}
            </dl>
          )}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Link to={`/members/${id}/edit`} className="btn-quiet btn-sm"><Icon name="edit" className="h-4 w-4" /> Edit</Link>
            <button className="btn-quiet btn-sm" onClick={remove} aria-label="Remove person"><Icon name="trash" className="h-4 w-4" /></button>
          </div>
        )}
      </header>

      {m.bio && <p className="prose-memory mt-8 border-l-[3px] border-marigold pl-5 !text-[16px]">{m.bio}</p>}

      <section className="mt-10">
        <h2 className="section-title">Family</h2>
        {family.length === 0 ? (
          <p className="text-sm text-ink-soft">Not connected to anyone yet. {canWrite && <Link className="link" to={`/families/${familyId}/members`}>Connect relationships</Link>}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {family.map(({ other, word }) => (
              <Link key={`${other._id}-${word}`} to={`/members/${other._id}`} className="sheet hoverable flex items-center gap-3 px-3 py-2.5">
                <Avatar name={other.name} photo={other.photoUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">{other.name}</span>
                <span className="text-sm capitalize text-ink-soft">{word}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="section-title !mb-0">Memories with {m.name.split(' ')[0]}</h2>
          {memoryCount > 12 && <Link className="link text-sm" to={`/families/${familyId}/memories?person=${id}`}>See all {memoryCount}</Link>}
        </div>
        {memoryCount === 0 ? (
          <p className="text-sm text-ink-soft">No memories tag {m.name.split(' ')[0]} yet. {canWrite && <Link className="link" to={`/families/${familyId}/memories/new?person=${id}`}>Write one</Link>}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {memories.data?.memories.map((mem) => (
              <Link key={mem._id} to={`/memories/${mem._id}`} className="sheet hoverable flex gap-3 p-3">
                {mem.mediaUrl && <img src={img(mem.mediaUrl, 120, 120)} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-[8px] object-cover" />}
                <div className="min-w-0">
                  <CategoryTag category={mem.category} />
                  <p className="truncate font-semibold">{mem.title}</p>
                  {mem.eventDate && <p className="text-xs text-ink-soft">{fmtDate(mem.eventDate)}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
