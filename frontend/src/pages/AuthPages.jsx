import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../AuthContext'
import { useFeatures } from '../ConfigContext'
import { ErrorBox } from '../components/ui'

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-[420px] pt-2 sm:pt-6">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="mt-1.5 text-ink-soft">{subtitle}</p>}
      <div className="sheet-pad mt-6">{children}</div>
    </div>
  )
}

// fields: [name, label, type, autocomplete, extra props]
function AuthForm({ fields, submitLabel, busyLabel = 'Please wait...', onSubmit, below, notice }) {
  const [values, setValues] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit(values)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate={false}>
      {notice}
      <ErrorBox message={error} />
      {fields.map(([name, label, type, autoComplete, { hint, ...extra } = {}]) => (
        <div key={name}>
          <label className="label" htmlFor={name}>{label}</label>
          <input id={name} className="input" type={type} required autoComplete={autoComplete} value={values[name] || ''}
            onChange={(e) => setValues({ ...values, [name]: e.target.value })} {...extra} />
          {hint && <p className="hint">{hint}</p>}
        </div>
      ))}
      {below}
      <button className="btn w-full py-3" disabled={busy}>{busy ? busyLabel : submitLabel}</button>
    </form>
  )
}

// after login, go back to the page the person wanted (for example an invitation link)
const useAfterLogin = () => {
  const navigate = useNavigate()
  const from = useLocation().state?.from
  return () => navigate(from || '/dashboard', { replace: true })
}

const PASSWORD = { minLength: 8, maxLength: 72, hint: 'At least 8 characters' }

export function Login() {
  const { login } = useAuth()
  const { email } = useFeatures()
  const done = useAfterLogin()
  const [params] = useSearchParams()
  const location = useLocation()
  return (
    <AuthCard title="Welcome back" subtitle="Log in to open your family record.">
      <AuthForm
        notice={params.get('expired') && <p className="rounded-[10px] bg-marigold-tint px-4 py-2.5 text-sm">Your session ended. Please log in again.</p>}
        fields={[['email', 'Email', 'email', 'email'], ['password', 'Password', 'password', 'current-password']]}
        below={email && <p className="-mt-1 text-right text-sm"><Link className="link" to="/forgot-password">Forgot password?</Link></p>}
        submitLabel="Log in" busyLabel="Logging in..."
        onSubmit={async (v) => { await login(v.email, v.password); done() }} />
      <p className="mt-5 text-center text-sm text-ink-soft">New here? <Link className="link" to="/register" state={location.state}>Create an account</Link></p>
    </AuthCard>
  )
}

export function Register() {
  const { register } = useAuth()
  const done = useAfterLogin()
  const location = useLocation()
  return (
    <AuthCard title="Start your family record" subtitle="Free, private, and yours to export any time.">
      <AuthForm
        fields={[['name', 'Your name', 'text', 'name', { maxLength: 80 }], ['email', 'Email', 'email', 'email'], ['password', 'Password', 'password', 'new-password', PASSWORD]]}
        submitLabel="Create account" busyLabel="Creating account..."
        onSubmit={async (v) => { await register(v.name, v.email, v.password); done() }} />
      <p className="mt-5 text-center text-sm text-ink-soft">Already have an account? <Link className="link" to="/login" state={location.state}>Log in</Link></p>
    </AuthCard>
  )
}

export function ForgotPassword() {
  const [sent, setSent] = useState('')
  return (
    <AuthCard title="Reset your password" subtitle="We will email you a link to choose a new one.">
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-[10px] bg-marigold-tint px-4 py-3 text-sm">{sent}</p>
          <Link to="/login" className="btn-quiet w-full">Back to log in</Link>
        </div>
      ) : (
        <AuthForm
          fields={[['email', 'Email', 'email', 'email']]}
          submitLabel="Send reset link" busyLabel="Sending..."
          onSubmit={async (v) => setSent((await api.post('/auth/forgot-password', { email: v.email })).data.message)} />
      )}
      {!sent && <p className="mt-5 text-center text-sm text-ink-soft">Remembered it? <Link className="link" to="/login">Log in</Link></p>}
    </AuthCard>
  )
}

export function ResetPassword() {
  const { token } = useParams()
  const { startSession } = useAuth()
  const navigate = useNavigate()
  return (
    <AuthCard title="Choose a new password" subtitle="This also logs you out on every other device.">
      <AuthForm
        fields={[['password', 'New password', 'password', 'new-password', PASSWORD]]}
        submitLabel="Save new password" busyLabel="Saving..."
        onSubmit={async (v) => {
          startSession((await api.post('/auth/reset-password', { token, password: v.password })).data)
          navigate('/dashboard', { replace: true })
        }} />
      <p className="mt-5 text-center text-sm text-ink-soft">Link not working? <Link className="link" to="/forgot-password">Get a new one</Link></p>
    </AuthCard>
  )
}
