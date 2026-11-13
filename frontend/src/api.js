import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 70000 })

export const tokenStore = {
  get: () => localStorage.getItem('token'),
  set: (t) => localStorage.setItem('token', t),
  clear: () => localStorage.removeItem('token'),
}

// ---- "server is waking up" signal ----
// Free hosting puts the API to sleep when idle; the first request can take ~50s. If a request is slow,
// we tell the UI so it can show a friendly banner instead of a frozen page.
let slow = 0
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn(slow > 0))
export const onSlowChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config._slowTimer = setTimeout(() => { slow++; config._wasSlow = true; emit() }, 4000)
  return config
})

const done = (config) => {
  if (!config) return
  clearTimeout(config._slowTimer)
  if (config._wasSlow) { slow = Math.max(0, slow - 1); emit() }
}

// expired / revoked token -> log out and go to login
api.interceptors.response.use(
  (res) => { done(res.config); return res },
  (err) => {
    done(err.config)
    const url = err.config?.url || ''
    const isAuthForm = /\/auth\/(login|register|change-password|reset-password|forgot-password)/.test(url) || (url.endsWith('/auth/me') && err.config?.method === 'delete')
    if (err.response?.status === 401 && !isAuthForm) {
      tokenStore.clear()
      if (!['/login', '/'].includes(window.location.pathname)) window.location.href = `/login?expired=1`
    }
    return Promise.reject(err)
  }
)

// turns an axios error into a readable message
export const errMsg = (err) => {
  if (err.code === 'ECONNABORTED') return 'The server took too long to answer. Try again in a moment.'
  if (!err.response) return 'Could not reach the server. Check your connection.'
  return err.response.data?.message || 'Something went wrong'
}

export default api
