import { Route, Routes } from 'react-router-dom'
import { Layout, ProtectedRoute } from './components/ui'
import Landing from './pages/Landing'
import { Login, Register } from './pages/AuthPages'
import Dashboard from './pages/Dashboard'
import FamilyForm from './pages/FamilyForm'
import FamilyPage from './pages/FamilyPage'
import MemberForm from './pages/MemberForm'
import MemoryList from './pages/MemoryList'
import MemoryForm from './pages/MemoryForm'
import MemoryDetail from './pages/MemoryDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/families/new" element={<FamilyForm />} />
          <Route path="/families/:id/edit" element={<FamilyForm />} />
          <Route path="/families/:id" element={<FamilyPage />} />
          <Route path="/families/:id/members/new" element={<MemberForm />} />
          <Route path="/members/:id/edit" element={<MemberForm />} />
          <Route path="/families/:id/memories" element={<MemoryList />} />
          <Route path="/families/:id/memories/new" element={<MemoryForm />} />
          <Route path="/memories/:id" element={<MemoryDetail />} />
          <Route path="/memories/:id/edit" element={<MemoryForm />} />
        </Route>
        <Route path="*" element={<p className="py-10 text-center">Page not found</p>} />
      </Route>
    </Routes>
  )
}
