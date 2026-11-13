import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { errMsg } from '../api'
import { ErrorBox } from '../components/ui'

function AuthForm({ title, fields, onSubmit, footer }) {
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
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-2xl font-bold text-forest">{title}</h1>
        <ErrorBox message={error} />
        {fields.map(([name, label, type]) => (
          <div key={name}>
            <label className="label">{label}</label>
            <input className="input" type={type} required value={values[name] || ''}
              onChange={(e) => setValues({ ...values, [name]: e.target.value })} />
          </div>
        ))}
        <button className="btn w-full" disabled={busy}>{busy ? 'Please wait...' : title}</button>
        <p className="text-center text-sm">{footer}</p>
      </form>
    </div>
  )
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  return (
    <AuthForm title="Log in" fields={[['email', 'Email', 'email'], ['password', 'Password', 'password']]}
      onSubmit={async (v) => { await login(v.email, v.password); navigate('/dashboard') }}
      footer={<>New here? <Link className="text-forest underline" to="/register">Create an account</Link></>} />
  )
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  return (
    <AuthForm title="Sign up"
      fields={[['name', 'Your name', 'text'], ['email', 'Email', 'email'], ['password', 'Password (min 8 characters)', 'password']]}
      onSubmit={async (v) => { await register(v.name, v.email, v.password); navigate('/dashboard') }}
      footer={<>Already have an account? <Link className="text-forest underline" to="/login">Log in</Link></>} />
  )
}
