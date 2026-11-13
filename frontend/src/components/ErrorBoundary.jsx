import { Component } from 'react'

// Catches a crash in one page so the whole app does not go blank
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error(error, info) }
  render() {
    if (!this.state.error) return this.props.children
    // a new version was deployed and an old page chunk is gone: reloading fixes it
    const stale = /dynamically imported module|Loading chunk/i.test(String(this.state.error?.message))
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl">{stale ? 'A new version is ready' : 'This page hit a problem'}</h1>
        <p className="mt-2 text-ink-soft">{stale ? 'Reload to get the latest ParamPara.' : 'Reload the page. If it keeps happening, go back to your families.'}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button className="btn" onClick={() => window.location.reload()}>Reload</button>
          <a className="btn-quiet" href="/dashboard">My families</a>
        </div>
      </div>
    )
  }
}
