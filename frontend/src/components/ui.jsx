import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export const Loading = () => <p className="py-10 text-center text-ink/60">Loading...</p>

export const ErrorBox = ({ message }) =>
  message ? <p className="mb-4 rounded-lg border border-terracotta bg-terracotta/10 px-3 py-2 text-sm text-terracotta">{message}</p> : null

export const Empty = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-sand p-8 text-center text-ink/60">{children}</div>
)

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="border-b border-sand bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to={user ? '/dashboard' : '/'} className="text-xl font-bold text-forest">ParamPara</Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="hidden text-ink/60 sm:inline">Hi, {user.name}</span>
                <button className="btn-light" onClick={() => { logout(); navigate('/') }}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-light">Log in</Link>
                <Link to="/register" className="btn">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8"><Outlet /></main>
    </div>
  )
}
