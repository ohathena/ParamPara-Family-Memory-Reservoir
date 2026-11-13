import { Link, useOutletContext } from 'react-router-dom'
import LineageTree from '../components/LineageTree'
import { useGet } from '../hooks/useGet'
import { Empty, ErrorBox, Loading } from '../components/ui'

export default function Tree() {
  const { family, canWrite } = useOutletContext()
  const { data, loading, error } = useGet(`/families/${family._id}/tree`)

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />
  const tree = data.tree

  if (tree.generations.length === 0) {
    return <Empty title="Your tree is empty" action={canWrite && <Link to="../members/new" className="btn">Add the first person</Link>}>Add people, then connect them as parents, children, spouses and siblings.</Empty>
  }

  const unconnected = tree.relationships.length === 0
  return (
    <div>
      {tree.hasCycle && <ErrorBox message="Some parent links form a loop (someone ends up as their own ancestor), so rows may look off. Check relationships on the People page." />}
      {unconnected && <p className="mb-5 rounded-[10px] bg-marigold-tint px-4 py-2.5 text-sm">Nobody is connected yet. {canWrite ? <>Link parents and children on the <Link className="link" to="../members">People</Link> page to grow the tree.</> : 'Once people are connected, the tree will grow here.'}</p>}
      <div className="sheet px-2 py-8">
        <LineageTree generations={tree.generations} relationships={tree.relationships} linkTo={(p) => `/members/${p.id}`} />
      </div>
      <p className="mt-4 text-center text-xs text-ink-soft">Tap a person to see their profile. Generations are worked out from parent and child links; a marigold ring marks someone who has passed away.</p>
    </div>
  )
}
