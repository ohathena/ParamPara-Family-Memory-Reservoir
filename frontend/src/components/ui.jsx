/* eslint-disable react-refresh/only-export-components */
import { Suspense, useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { onSlowChange } from '../api'
import { useAuth } from '../AuthContext'
import { CATEGORY_DOT } from '../constants'
import { img, initials } from '../utils'

// ---------- icons (inline, so there is no icon library to download) ----------
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  tree: 'M12 21v-7m0 0c-4 0-7-3-7-7 4 0 7 3 7 7zm0-3c3 0 6-2 6-6-3 0-6 2-6 6z',
  book: 'M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5v-15zM5 19.5A1.5 1.5 0 006.5 21H19',
  users: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1m17 0v-1a4 4 0 00-3-3.87M14 4.13a4 4 0 010 7.75M13.5 7.5a4 4 0 11-8 0 4 4 0 018 0z',
  clock: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v10H6z',
  chat: 'M21 12a8 8 0 01-11.6 7.1L4 20l1.1-4.6A8 8 0 1121 12z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  arrowLeft: 'M19 12H5m0 0l6-6m-6 6l6 6',
  search: 'M20 20l-4.5-4.5M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z',
}
export const Icon = ({ name, className = 'h-[18px] w-[18px]' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
)

// ---------- small building blocks ----------
export const Loading = ({ rows = 2 }) => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    <div className="skeleton h-8 w-1/3" />
    {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-24" />)}
  </div>
)

export const ErrorBox = ({ message }) =>
  message ? (
    <p role="alert" className="mb-4 rounded-[10px] border border-kumkum/30 bg-kumkum-tint px-4 py-2.5 text-sm text-kumkum-dark">{message}</p>
  ) : null

export const Empty = ({ title, children, action }) => (
  <div className="rounded-[14px] border border-dashed border-line px-6 py-10 text-center">
    {title && <p className="font-display mb-1 text-xl">{title}</p>}
    <p className="mx-auto max-w-sm text-sm text-ink-soft">{children}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
)

// Photo if there is one, otherwise initials on a colour picked from the name (same colour every time)
const AVATAR_COLORS = ['#8c2232', '#2f4a8a', '#3d6b4f', '#7a5c2e', '#6b4c9a', '#b4552d']
export function Avatar({ name = '?', photo, size = 'md', deceased = false }) {
  const [broken, setBroken] = useState(false)
  const px = { xs: 24, sm: 32, md: 44, lg: 64, xl: 112 }[size]
  const color = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
  const ring = deceased ? 'ring-2 ring-marigold ring-offset-2 ring-offset-sheet' : ''
  const style = { width: px, height: px, fontSize: Math.max(10, px * 0.36) }
  if (photo && !broken) {
    return <img src={img(photo, px * 2, px * 2)} alt="" width={px} height={px} loading="lazy" onError={() => setBroken(true)} className={`shrink-0 rounded-full bg-line-soft object-cover ${ring}`} style={style} />
  }
  return (
    <span className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${ring}`} style={{ ...style, background: color }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

export const CategoryTag = ({ category }) => (
  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
    <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_DOT[category] || CATEGORY_DOT.Other }} aria-hidden="true" />
    {category}
  </span>
)

const ROLE_STYLE = { owner: 'bg-kumkum text-white', editor: 'bg-neel-tint text-neel', viewer: 'bg-line-soft text-ink-soft' }
export const RoleTag = ({ role }) =>
  role ? <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ROLE_STYLE[role] || ROLE_STYLE.viewer}`}>{role}</span> : null

export const Logo = ({ small = false }) => (
  <span className="flex items-center gap-2.5">
    <svg viewBox="0 0 32 32" className={small ? 'h-7 w-7' : 'h-8 w-8'} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#8c2232" />
      <path d="M10 9v14M22 9v14M10 16h12" stroke="#e2a23b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="10" cy="9" r="2.4" fill="#fff" /><circle cx="22" cy="9" r="2.4" fill="#fff" /><circle cx="16" cy="23" r="2.4" fill="#fff" />
      <path d="M16 16v5" stroke="#e2a23b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
    <span className="font-display text-[1.35rem] leading-none text-ink">ParamPara</span>
  </span>
)

// a person's photo + name, used in comments, feeds and lists
export const Person = ({ name, photo, sub, size = 'sm' }) => (
  <span className="flex min-w-0 items-center gap-2.5">
    <Avatar name={name} photo={photo} size={size} />
    <span className="min-w-0">
      <span className="block truncate font-medium">{name}</span>
      {sub && <span className="block truncate text-xs text-ink-soft">{sub}</span>}
    </span>
  </span>
)

export const BackLink = ({ to, children }) => (
  <Link to={to} className="mb-4 flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
    <Icon name="arrowLeft" className="h-4 w-4" /> {children}
  </Link>
)

// ---------- routing helpers ----------
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="mx-auto max-w-5xl px-4 py-8"><Loading /></div>
  // remember where the person wanted to go (for example an invitation link), so login can send them back
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

// ---------- page frame ----------
function WakeBanner() {
  const [slow, setSlow] = useState(false)
  useEffect(() => onSlowChange(setSlow), [])
  if (!slow) return null
  return (
    <div role="status" className="border-b border-marigold/40 bg-marigold-tint px-4 py-2 text-center text-sm text-ink">
      Waking up the server. On the free plan this can take up to a minute after a quiet spell.
    </div>
  )
}

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // the menu belongs to the page it was opened on, so it closes by itself after navigating
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === location.pathname
  const setOpen = (v) => setOpenOn(v ? location.pathname : null)

  const navLink = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'text-ink' : 'text-ink-soft hover:text-ink'}`

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-sheet focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <WakeBanner />
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to={user ? '/dashboard' : '/'} aria-label="ParamPara home"><Logo /></Link>
          {user ? (
            <>
              <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
                <NavLink to="/dashboard" className={navLink}>My families</NavLink>
                <NavLink to="/profile" className="ml-2 flex items-center gap-2 rounded-full border border-line bg-sheet py-1 pl-1 pr-3 text-sm hover:border-ink/25" title="Your account">
                  <Avatar name={user.name} size="xs" />
                  <span className="max-w-[140px] truncate">{user.name}</span>
                </NavLink>
              </nav>
              <button className="btn-quiet btn-sm sm:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
                <Icon name={open ? 'close' : 'menu'} />
              </button>
            </>
          ) : (
            <nav className="flex items-center gap-2" aria-label="Account">
              <Link to="/login" className="btn-quiet btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-sm">Sign up</Link>
            </nav>
          )}
        </div>
        {user && open && (
          <nav className="border-t border-line bg-sheet px-4 py-3 sm:hidden" aria-label="Mobile">
            <div className="mb-3"><Person name={user.name} sub={user.email} /></div>
            <div className="grid gap-1">
              <Link to="/dashboard" className="rounded-lg px-2 py-2 hover:bg-paper">My families</Link>
              <Link to="/profile" className="rounded-lg px-2 py-2 hover:bg-paper">Account settings</Link>
              <button className="rounded-lg px-2 py-2 text-left text-kumkum hover:bg-paper" onClick={() => { logout(); navigate('/') }}>Log out</button>
            </div>
          </nav>
        )}
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Suspense fallback={<Loading />}><Outlet /></Suspense>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">
        ParamPara keeps your family's stories private. Only people you invite can see them.
      </footer>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-5xl text-kumkum">404</p>
      <h1 className="font-display mt-2 text-2xl">This page is not in the record</h1>
      <p className="mt-2 text-ink-soft">The link may be old, or the page was moved.</p>
      <Link to="/" className="btn mt-6">Go to the home page</Link>
    </div>
  )
}
