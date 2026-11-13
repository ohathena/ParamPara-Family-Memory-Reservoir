/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// A styled replacement for window.confirm():   if (await confirm({ title, body, action: 'Delete' })) { ... }
const ConfirmContext = createContext(null)
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const ref = useRef(null)

  const confirm = useCallback((opts) => new Promise((resolve) => setState({ danger: true, action: 'Confirm', ...opts, resolve })), [])

  useEffect(() => {
    if (state && ref.current && !ref.current.open) ref.current.showModal()
  }, [state])

  const close = (answer) => {
    ref.current?.close()
    state?.resolve(answer)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <dialog ref={ref} onCancel={(e) => { e.preventDefault(); close(false) }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[14px] border border-line bg-sheet p-0 text-ink" aria-labelledby="confirm-title">
          <div className="p-6">
            <h2 id="confirm-title" className="font-display text-2xl">{state.title}</h2>
            {state.body && <p className="mt-2 text-sm text-ink-soft">{state.body}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-quiet" onClick={() => close(false)} autoFocus>Cancel</button>
              <button className={state.danger ? 'btn bg-kumkum' : 'btn'} onClick={() => close(true)}>{state.action}</button>
            </div>
          </div>
        </dialog>
      )}
    </ConfirmContext.Provider>
  )
}
