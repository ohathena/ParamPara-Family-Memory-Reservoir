/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'

// Which optional server features are on (password emails, photo uploads). Loaded once.
const ConfigContext = createContext({ email: false, uploads: false })
export const useFeatures = () => useContext(ConfigContext)

export function ConfigProvider({ children }) {
  const [features, setFeatures] = useState({ email: false, uploads: false })
  useEffect(() => {
    api.get('/config').then((res) => setFeatures(res.data.features)).catch(() => {})
  }, [])
  return <ConfigContext.Provider value={features}>{children}</ConfigContext.Provider>
}
