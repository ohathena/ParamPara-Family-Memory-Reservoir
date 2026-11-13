import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../AuthContext'
import { useConfirm } from '../components/Confirm'
import { useToast } from '../components/Toast'
import { Avatar, ErrorBox } from '../components/ui'
import { fmtDate } from '../utils'

const Section = ({ title, text, children, danger }) => (
  <section className={`grid gap-4 border-t py-7 sm:grid-cols-[220px_1fr] ${danger ? 'border-kumkum/25' : 'border-line'}`}>
    <div>
      <h2 className={`font-display text-xl ${danger ? 'text-kumkum' : ''}`}>{title}</h2>
      {text && <p className="mt-1 text-sm text-ink-soft">{text}</p>}
    </div>
    <div className="max-w-md">{children}</div>
  </section>
)

export default function Profile() {
  const { user, setUser, logout, startSession } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [name, setName] = useState(user.name)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [deletePw, setDeletePw] = useState('')
  const [errors, setErrors] = useState({})

  // runs an action, shows its error next to the right form
  const run = (key, fn) => async (e) => {
    e?.preventDefault()
    setErrors((x) => ({ ...x, [key]: '' }))
    try { await fn() } catch (err) { setErrors((x) => ({ ...x, [key]: errMsg(err) })) }
  }

  const saveName = run('name', async () => {
    setUser((await api.patch('/auth/me', { name })).data.user)
    toast.success('Name saved')
  })
  const savePassword = run('pw', async () => {
    startSession((await api.post('/auth/change-password', pw)).data) // keeps this device logged in
    setPw({ currentPassword: '', newPassword: '' })
    toast.success('Password changed. Other devices were logged out.')
  })
  const logoutAll = run('all', async () => {
    if (!(await confirm({ title: 'Log out on other devices?', body: 'Every phone and computer where you are logged in will need to log in again. This one stays logged in.', action: 'Log them out', danger: false }))) return
    startSession((await api.post('/auth/logout-all')).data)
    toast.success('Logged out on all other devices')
  })
  const deleteAccount = run('delete', async () => {
    if (!(await confirm({ title: 'Delete your account?', body: 'Families you own are deleted for everyone, with all their memories. You leave the families you joined; memories you wrote there stay. This cannot be undone.', action: 'Delete my account' }))) return
    await api.delete('/auth/me', { data: { password: deletePw } })
    logout()
    navigate('/', { replace: true })
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div>
          <h1 className="page-title">Your account</h1>
          <p className="text-sm text-ink-soft">{user.email}{user.createdAt && `, member since ${fmtDate(user.createdAt)}`}</p>
        </div>
      </div>

      <Section title="Display name" text="Shown next to memories and comments you write.">
        <form onSubmit={saveName} className="space-y-3">
          <ErrorBox message={errors.name} />
          <input className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" />
          <button className="btn" disabled={name.trim() === user.name}>Save name</button>
        </form>
      </Section>

      <Section title="Password" text="Changing it logs you out on your other devices.">
        <form onSubmit={savePassword} className="space-y-3">
          <ErrorBox message={errors.pw} />
          <input className="input" type="password" required autoComplete="current-password" placeholder="Current password" aria-label="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <input className="input" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="New password, 8+ characters" aria-label="New password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          <button className="btn">Change password</button>
        </form>
      </Section>

      <Section title="Sessions" text="Lost a phone, or logged in on a shared computer?">
        <ErrorBox message={errors.all} />
        <div className="flex flex-wrap gap-2">
          <button className="btn-quiet" onClick={logoutAll}>Log out on other devices</button>
          <button className="btn-quiet" onClick={() => { logout(); navigate('/') }}>Log out here</button>
        </div>
      </Section>

      <Section title="Delete account" text="Permanent. Download any family you own first, from its Sharing page." danger>
        <form onSubmit={deleteAccount} className="space-y-3">
          <ErrorBox message={errors.delete} />
          <input className="input" type="password" required autoComplete="current-password" placeholder="Your password" aria-label="Password to confirm deletion" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} />
          <button className="btn-danger">Delete my account</button>
        </form>
      </Section>
    </div>
  )
}
