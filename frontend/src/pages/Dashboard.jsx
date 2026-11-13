import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errMsg } from '../api'
import { Empty, ErrorBox, Loading } from '../components/ui'

export default function Dashboard() {
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/families')
      .then((res) => setFamilies(res.data.families))
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-forest">My families</h1>
        <Link to="/families/new" className="btn">+ New family</Link>
      </div>
      <ErrorBox message={error} />
      {loading ? <Loading /> : families.length === 0 ? (
        <Empty>You don't have a family space yet. Create one to get started.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {families.map((f) => (
            <Link key={f._id} to={`/families/${f._id}`} className="card block hover:border-forest">
              <h2 className="text-lg font-bold">{f.name}</h2>
              <p className="mt-1 text-sm text-ink/70">{f.description || 'No description'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
