import { useEffect, useState } from 'react'
import api, { errMsg } from '../api'

// Loads data from the API and keeps loading / error state, so pages do not repeat this code.
//   const { data, loading, error, reload } = useGet('/families', { page: 1 })
// Pass path = null to wait (for example until another request gives you an id).
// While new data is loading, the previous data of the same path is kept, so lists do not flash empty.
export function useGet(path, params) {
  const [tick, setTick] = useState(0) // changes when reload() is called
  const [result, setResult] = useState({ requestKey: null, path: null, data: null, error: '' })
  const paramsKey = JSON.stringify(params || {})
  const requestKey = `${path}|${paramsKey}|${tick}`

  useEffect(() => {
    if (!path) return
    let cancelled = false
    api.get(path, { params: JSON.parse(paramsKey) })
      .then((res) => !cancelled && setResult({ requestKey, path, data: res.data, error: '' }))
      .catch((err) => !cancelled && setResult({ requestKey, path, data: null, error: errMsg(err) }))
    return () => { cancelled = true }
  }, [path, paramsKey, requestKey])

  return {
    data: path && result.path === path ? result.data : null,
    error: result.requestKey === requestKey ? result.error : '',
    loading: !!path && result.requestKey !== requestKey,
    reload: () => setTick((t) => t + 1),
  }
}
