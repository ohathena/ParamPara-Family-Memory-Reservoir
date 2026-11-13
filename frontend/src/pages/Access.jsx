import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useConfirm } from '../components/Confirm'
import { useToast } from '../components/Toast'
import { ErrorBox, Icon, Person, RoleTag } from '../components/ui'
import { ROLE_INFO } from '../constants'
import { fmtDate } from '../utils'

const RoleChoice = ({ value, onChange, name }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {['editor', 'viewer'].map((r) => (
      <label key={r} className={`cursor-pointer rounded-[10px] border p-3 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-kumkum/25 ${value === r ? 'border-kumkum bg-kumkum-tint' : 'border-line hover:border-ink/25'}`}>
        <input type="radio" name={name} value={r} className="sr-only" checked={value === r} onChange={() => onChange(r)} />
        <span className="font-semibold capitalize">{r}</span>
        <span className="mt-0.5 block text-ink-soft">{ROLE_INFO[r]}</span>
      </label>
    ))}
  </div>
)

export default function Access() {
  const { family, isOwner, reloadFamily } = useOutletContext()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailRole, setEmailRole] = useState('editor')
  const [inviteRole, setInviteRole] = useState('editor')
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')
  const id = family._id

  const run = async (action, message, after) => {
    setError('')
    try {
      const res = await action()
      if (message) toast.success(message)
      after?.(res)
    } catch (err) {
      setError(errMsg(err))
    }
  }

  const people = [
    ...(family.owner?.name ? [{ ...family.owner, role: 'owner' }] : []),
    ...family.collaborators.map((u) => ({ ...u, role: 'editor' })),
    ...(family.viewers || []).map((u) => ({ ...u, role: 'viewer' })),
  ]

  const link = invite ? `${window.location.origin}/join/${invite.token}` : ''
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Join our family record "${family.name}" on ParamPara: ${link}`)}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success('Link copied') } catch { toast.error('Could not copy. Select the link and copy it yourself.') }
  }

  const download = () => run(async () => {
    const res = await api.get(`/families/${id}/export`, { responseType: 'blob' })
    const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || 'parampara-export.json'
    const url = URL.createObjectURL(res.data)
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    a.click()
    URL.revokeObjectURL(url)
  }, 'Download started')

  return (
    <div className="max-w-2xl space-y-10">
      <ErrorBox message={error} />

      <section>
        <h2 className="section-title">People with access</h2>
        <ul className="divide-y divide-line-soft rounded-[14px] border border-line bg-sheet">
          {people.map((p) => (
            <li key={p._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><Person name={p.name} sub={p.email} /></div>
              {isOwner && p.role !== 'owner' ? (
                <div className="flex items-center gap-2">
                  <select className="input !w-auto !py-1.5 text-sm" value={p.role} aria-label={`Role for ${p.name}`}
                    onChange={(e) => run(() => api.patch(`/families/${id}/collaborators/${p._id}`, { role: e.target.value }), `${p.name} is now ${e.target.value === 'editor' ? 'an editor' : 'a viewer'}`, reloadFamily)}>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button className="text-ink-soft hover:text-kumkum" aria-label={`Remove ${p.name}`} onClick={async () => {
                    if (await confirm({ title: `Remove ${p.name}?`, body: 'They lose access to this family. Memories they wrote stay.', action: 'Remove access' })) run(() => api.delete(`/families/${id}/collaborators/${p._id}`), 'Access removed', reloadFamily)
                  }}><Icon name="close" className="h-4 w-4" /></button>
                </div>
              ) : <RoleTag role={p.role} />}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <section className="sheet-pad space-y-5">
          <div>
            <h2 className="section-title !mb-1">Invite a relative</h2>
            <p className="text-sm text-ink-soft">Make a link and send it on WhatsApp or email. It works for one person and expires in 7 days.</p>
          </div>
          <RoleChoice name="invite-role" value={inviteRole} onChange={(r) => { setInviteRole(r); setInvite(null) }} />
          {!invite ? (
            <button className="btn" onClick={() => run(() => api.post(`/families/${id}/invitations`, { role: inviteRole }), null, (res) => setInvite(res.data))}>
              <Icon name="link" className="h-4 w-4" /> Create invite link
            </button>
          ) : (
            <div className="rounded-[10px] bg-marigold-tint p-3">
              <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-ink-soft">For one {invite.role}, expires {fmtDate(invite.expiresAt)}. Copy it now, it is shown only once.</span>
                <div className="flex gap-2">
                  <button className="btn-quiet btn-sm" onClick={copy}>Copy</button>
                  <a className="btn btn-sm" href={whatsapp} target="_blank" rel="noreferrer noopener">Send on WhatsApp</a>
                </div>
              </div>
            </div>
          )}
          <form className="border-t border-line-soft pt-5" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/families/${id}/collaborators`, { email, role: emailRole }), null, (res) => { toast.success(res.data.message); setEmail(''); reloadFamily() }) }}>
            <label className="label" htmlFor="collab">Already on ParamPara? Add them by email</label>
            <div className="flex flex-wrap gap-2">
              <input id="collab" className="input min-w-0 basis-full sm:basis-0 sm:flex-1" type="email" required placeholder="their@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <select className="input flex-1 sm:!w-auto sm:flex-none" value={emailRole} onChange={(e) => setEmailRole(e.target.value)} aria-label="Role"><option value="editor">as editor</option><option value="viewer">as viewer</option></select>
              <button className="btn">Add</button>
            </div>
          </form>
        </section>
      )}

      {isOwner && (
        <section className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <div>
            <h2 className="section-title !mb-1">Download everything</h2>
            <p className="text-sm text-ink-soft">People, relationships, memories and comments in one file. Your data stays yours.</p>
          </div>
          <button className="btn-quiet" onClick={download}><Icon name="download" className="h-4 w-4" /> Download archive</button>
        </section>
      )}

      <section className="border-t border-kumkum/25 pt-8">
        <h2 className="section-title !mb-1 text-kumkum">{isOwner ? 'Delete this family' : 'Leave this family'}</h2>
        <p className="mb-4 text-sm text-ink-soft">{isOwner ? 'Removes every person, relationship, memory and comment, for everyone. This cannot be undone.' : 'You lose access. Memories you wrote stay with the family.'}</p>
        {isOwner ? (
          <button className="btn-danger" onClick={async () => {
            if (await confirm({ title: `Delete ${family.name}?`, body: 'Everything in it is deleted for everyone. Consider downloading the archive first.', action: 'Delete family' })) run(() => api.delete(`/families/${id}`), 'Family deleted', () => navigate('/dashboard'))
          }}>Delete family</button>
        ) : (
          <button className="btn-danger" onClick={async () => {
            if (await confirm({ title: `Leave ${family.name}?`, body: 'You will need a new invite to come back.', action: 'Leave family' })) run(() => api.delete(`/families/${id}/leave`), 'You left the family', () => navigate('/dashboard'))
          }}>Leave family</button>
        )}
      </section>
    </div>
  )
}
