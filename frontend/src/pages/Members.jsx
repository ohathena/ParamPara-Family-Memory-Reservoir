import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useConfirm } from '../components/Confirm'
import { useToast } from '../components/Toast'
import { useGet } from '../hooks/useGet'
import { Avatar, Empty, ErrorBox, Icon, Loading } from '../components/ui'
import { REL_TYPES } from '../constants'
import { lifespan } from '../utils'

export default function Members() {
  const { family, canWrite } = useOutletContext()
  const toast = useToast()
  const confirm = useConfirm()
  const members = useGet(`/families/${family._id}/members`)
  const rels = useGet(`/families/${family._id}/relationships`)
  const [rel, setRel] = useState({ source: '', type: 'parent', target: '' })
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const list = members.data?.members || []
  const relationships = rels.data?.relationships || []
  const shown = query ? list.filter((m) => `${m.name} ${m.nickname}`.toLowerCase().includes(query.toLowerCase())) : list

  const addRelationship = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/relationships', rel)
      toast.success('Relationship added')
      setRel({ ...rel, source: '', target: '' })
      rels.reload()
    } catch (err) { setError(errMsg(err)) }
  }
  const removeRelationship = async (r) => {
    if (!(await confirm({ title: 'Remove this relationship?', body: `${r.source?.name} is the ${r.type} of ${r.target?.name}. The people stay in the tree.`, action: 'Remove' }))) return
    try { await api.delete(`/relationships/${r._id}`); toast.success('Relationship removed'); rels.reload() } catch (err) { setError(errMsg(err)) }
  }

  if (members.loading && !members.data) return <Loading />

  return (
    <div className="space-y-12">
      <ErrorBox message={members.error || rels.error} />
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title !mb-0">People in the tree</h2>
          <div className="flex gap-2">
            {list.length > 8 && <input className="input !w-44 !py-1.5" placeholder="Find a person" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a person" />}
            {canWrite && <Link to="new" className="btn btn-sm"><Icon name="plus" className="h-4 w-4" /> Add a person</Link>}
          </div>
        </div>
        {list.length === 0 ? (
          <Empty title="Nobody here yet" action={canWrite && <Link to="new" className="btn">Add the first person</Link>}>Start with the eldest person you know about, then work down. People do not need an account.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((m) => (
              <Link key={m._id} to={`/members/${m._id}`} className="sheet hoverable flex flex-col items-center px-3 py-5 text-center">
                <Avatar name={m.name} photo={m.photoUrl} size="lg" deceased={!!m.deathDate} />
                <span className="mt-2.5 font-semibold leading-tight">{m.name}</span>
                {m.nickname && <span className="text-xs text-kumkum">{m.nickname}</span>}
                <span className="mt-0.5 text-xs text-ink-soft">{lifespan(m.birthDate, m.deathDate) || ' '}</span>
              </Link>
            ))}
          </div>
        )}
        {list.some((m) => m.deathDate) && <p className="mt-3 text-xs text-ink-soft">A marigold ring marks someone who has passed away.</p>}
      </section>

      <section>
        <h2 className="section-title">How everyone is related</h2>
        <ErrorBox message={error} />
        {canWrite && list.length >= 2 && (
          <form className="sheet-pad mb-5 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto]" onSubmit={addRelationship}>
            <div>
              <label className="label" htmlFor="src">Person</label>
              <select id="src" className="input" required value={rel.source} onChange={(e) => setRel({ ...rel, source: e.target.value })}>
                <option value="">Choose...</option>
                {list.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="type">is the</label>
              <select id="type" className="input" value={rel.type} onChange={(e) => setRel({ ...rel, type: e.target.value })}>
                {REL_TYPES.map((t) => <option key={t} value={t}>{t} of</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tgt">Person</label>
              <select id="tgt" className="input" required value={rel.target} onChange={(e) => setRel({ ...rel, target: e.target.value })}>
                <option value="">Choose...</option>
                {list.filter((m) => m._id !== rel.source).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <button className="btn">Connect</button>
          </form>
        )}
        {relationships.length === 0 ? (
          <Empty>{list.length < 2 ? 'Add at least two people, then connect them here.' : 'Connect parents, children, spouses and siblings to draw the tree.'}</Empty>
        ) : (
          <ul className="divide-y divide-line-soft rounded-[14px] border border-line bg-sheet">
            {relationships.map((r) => (
              <li key={r._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span><b>{r.source?.name}</b> is the <span className="font-medium text-kumkum">{r.type}</span> of <b>{r.target?.name}</b></span>
                {canWrite && <button className="text-ink-soft hover:text-kumkum" onClick={() => removeRelationship(r)} aria-label={`Remove: ${r.source?.name} ${r.type} of ${r.target?.name}`}><Icon name="trash" className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
