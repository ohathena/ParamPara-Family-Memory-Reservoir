import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useToast } from '../components/Toast'
import { useGet } from '../hooks/useGet'
import { ErrorBox, Loading, RoleTag } from '../components/ui'
import { ROLE_INFO } from '../constants'

export default function Join() {
  const { token } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, loading, error } = useGet(`/invitations/${token}`)
  const [busy, setBusy] = useState(false)
  const [acceptError, setAcceptError] = useState('')

  const accept = async () => {
    setBusy(true)
    try {
      const res = await api.post(`/invitations/${token}/accept`)
      toast.success(res.data.message)
      navigate(`/families/${res.data.familyId}`, { replace: true })
    } catch (err) {
      setAcceptError(errMsg(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  const f = data?.family
  return (
    <div className="mx-auto max-w-md pt-4 text-center">
      {error ? (
        <>
          <h1 className="page-title">This invite cannot be used</h1>
          <p className="mt-2 text-ink-soft">{error} Ask the person who sent it for a new link.</p>
          <Link to="/dashboard" className="btn-quiet mt-6">Go to my families</Link>
        </>
      ) : (
        <>
          <p className="text-ink-soft">{f.invitedBy ? `${f.invitedBy} invited you to join` : 'You are invited to join'}</p>
          <h1 className="page-title mt-1">{f.name}</h1>
          {f.description && <p className="mt-2 text-ink-soft">{f.description}</p>}
          <div className="sheet-pad mt-6 text-left">
            <div className="flex items-center gap-2"><span className="text-sm font-medium">You will join as</span><RoleTag role={f.role} /></div>
            <p className="mt-1 text-sm text-ink-soft">{ROLE_INFO[f.role]}.</p>
          </div>
          <ErrorBox message={acceptError} />
          <button className="btn mt-5 w-full py-3" onClick={accept} disabled={busy}>{busy ? 'Joining...' : `Join ${f.name}`}</button>
        </>
      )}
    </div>
  )
}
