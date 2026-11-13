import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import LineageTree from '../components/LineageTree'
import { Icon } from '../components/ui'

// A sample family, drawn with the same tree component the app uses
const P = (id, name, nickname, birthDate, deathDate) => ({ id, name, nickname, birthDate, deathDate, photoUrl: '' })
const SAMPLE = {
  generations: [
    { level: 0, members: [P('d', 'Prem Singh', 'Dada ji', '1944-01-01', '2016-01-01'), P('k', 'Kamla Devi', 'Dadi', '1948-01-01')] },
    { level: 1, members: [P('r', 'Rajesh', 'Papa', '1974-01-01'), P('s', 'Sunita', 'Mummy', '1977-01-01'), P('c', 'Sunil', 'Chacha ji', '1978-01-01')] },
    { level: 2, members: [P('a', 'Aarav', '', '2003-01-01'), P('p', 'Priya', '', '2006-01-01')] },
  ],
  relationships: [
    { source: 'd', target: 'k', type: 'spouse' }, { source: 'r', target: 's', type: 'spouse' },
    { source: 'd', target: 'r', type: 'parent' }, { source: 'k', target: 'r', type: 'parent' },
    { source: 'd', target: 'c', type: 'parent' }, { source: 'k', target: 'c', type: 'parent' },
    { source: 'r', target: 'a', type: 'parent' }, { source: 's', target: 'a', type: 'parent' },
    { source: 'r', target: 'p', type: 'parent' }, { source: 's', target: 'p', type: 'parent' },
  ],
}

const FEATURES = [
  ['tree', 'A tree for everyone', 'Add grandparents and cousins who will never sign up. Dates, photos, nicknames, all of it.'],
  ['book', 'Stories with the people in them', 'Recipes, letters, weddings and diaries, each tagged to the family members it is about.'],
  ['lock', 'Private by default', 'Only people you invite can see anything. Elders can join as viewers and just read and comment.'],
]

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 pt-2 md:grid-cols-[1fr_1.15fr] md:pt-8">
        <div className="min-w-0">
          <p className="font-display text-[2.6rem] leading-none text-kumkum" lang="hi">परम्परा</p>
          <h1 className="font-display mt-4 text-[2.5rem] leading-[1.08] text-ink sm:text-[3.1rem]">
            Dadi&apos;s recipes. Dada ji&apos;s diaries. Kept for the next generation.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] text-ink-soft">
            ParamPara is a private family record. Build your family tree, write down the stories behind old photos, and invite relatives to add what they remember.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={user ? '/dashboard' : '/register'} className="btn px-6 py-3 text-[15px]">{user ? 'Open my families' : 'Start your family record'}</Link>
            {!user && <Link to="/login" className="btn-quiet px-6 py-3 text-[15px]">Log in</Link>}
          </div>
          <p className="mt-4 text-sm text-ink-soft">Free to use. No ads. Export your data any time.</p>
        </div>
        <div className="min-w-0 rounded-[18px] border border-line bg-sheet px-1 py-7 sm:px-4">
          <LineageTree {...SAMPLE} animate labels={false} />
        </div>
      </section>

      <section className="grid gap-x-10 gap-y-8 border-t border-line pt-10 sm:grid-cols-3">
        {FEATURES.map(([icon, title, text]) => (
          <div key={title}>
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-kumkum-tint text-kumkum"><Icon name={icon} /></span>
            <h2 className="font-display text-xl">{title}</h2>
            <p className="mt-1.5 text-[15px] text-ink-soft">{text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[18px] bg-ink px-6 py-10 text-center text-white sm:px-10">
        <h2 className="font-display text-[1.9rem] leading-tight">Ask them now, while you still can.</h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-white/75">Sit with the elders this weekend. Write down one story. It takes ten minutes, and your grandchildren will read it.</p>
        <Link to={user ? '/dashboard' : '/register'} className="btn mt-6 bg-marigold px-6 py-3 text-ink hover:bg-marigold/90">{user ? 'Write a memory' : 'Create a free account'}</Link>
      </section>
    </div>
  )
}
