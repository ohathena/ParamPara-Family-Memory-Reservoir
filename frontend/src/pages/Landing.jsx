import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="py-10 text-center">
      <h1 className="mb-4 text-4xl font-bold text-forest sm:text-5xl">Keep your family's stories alive</h1>
      <p className="mx-auto mb-8 max-w-xl text-lg text-ink/70">
        Photos without context, recipes only grandma knows, stories nobody wrote down. ParamPara is a private
        place to save them so they reach the next generation.
      </p>
      <Link to={user ? '/dashboard' : '/register'} className="btn text-base">
        {user ? 'Go to my families' : 'Start your family archive'}
      </Link>
      <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
        {[
          ['Family spaces', 'Private to the people you invite.'],
          ['Family tree', 'Add everyone, even those without an account.'],
          ['Memories', 'Stories, recipes, letters, traditions and more.'],
        ].map(([t, d]) => (
          <div key={t} className="card">
            <h3 className="mb-1 font-bold text-terracotta">{t}</h3>
            <p className="text-sm text-ink/70">{d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
