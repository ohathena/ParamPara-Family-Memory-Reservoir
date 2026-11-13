import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout, NotFound, ProtectedRoute } from './components/ui'

// every page is loaded only when it is opened, so the first load stays small
const page = (load, name = 'default') => lazy(() => load().then((m) => ({ default: m[name] })))
const Landing = page(() => import('./pages/Landing'))
const Login = page(() => import('./pages/AuthPages'), 'Login')
const Register = page(() => import('./pages/AuthPages'), 'Register')
const ForgotPassword = page(() => import('./pages/AuthPages'), 'ForgotPassword')
const ResetPassword = page(() => import('./pages/AuthPages'), 'ResetPassword')
const Dashboard = page(() => import('./pages/Dashboard'))
const Profile = page(() => import('./pages/Profile'))
const Join = page(() => import('./pages/Join'))
const FamilyForm = page(() => import('./pages/FamilyForm'))
const FamilyLayout = page(() => import('./pages/FamilyLayout'))
const Overview = page(() => import('./pages/Overview'))
const Members = page(() => import('./pages/Members'))
const Tree = page(() => import('./pages/Tree'))
const Timeline = page(() => import('./pages/Timeline'))
const Access = page(() => import('./pages/Access'))
const MemberForm = page(() => import('./pages/MemberForm'))
const MemberProfile = page(() => import('./pages/MemberProfile'))
const MemoryList = page(() => import('./pages/MemoryList'))
const MemoryForm = page(() => import('./pages/MemoryForm'))
const MemoryDetail = page(() => import('./pages/MemoryDetail'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/join/:token" element={<Join />} />
          <Route path="/families/new" element={<FamilyForm />} />
          <Route path="/families/:id/edit" element={<FamilyForm />} />
          <Route path="/families/:id" element={<FamilyLayout />}>
            <Route index element={<Overview />} />
            <Route path="members" element={<Members />} />
            <Route path="members/new" element={<MemberForm />} />
            <Route path="tree" element={<Tree />} />
            <Route path="memories" element={<MemoryList />} />
            <Route path="memories/new" element={<MemoryForm />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="access" element={<Access />} />
          </Route>
          <Route path="/members/:id" element={<MemberProfile />} />
          <Route path="/members/:id/edit" element={<MemberForm />} />
          <Route path="/memories/:id" element={<MemoryDetail />} />
          <Route path="/memories/:id/edit" element={<MemoryForm />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
