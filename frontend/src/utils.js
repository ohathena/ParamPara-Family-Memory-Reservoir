// dates are stored as UTC midnight, so show them in UTC (otherwise some time zones show the day before)
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''

export const year = (d) => (d ? new Date(d).getUTCFullYear() : '')
export const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

// "1944 – 2016", "b. 1974", or ''
export const lifespan = (birth, death) => {
  if (birth && death) return `${year(birth)} – ${year(death)}`
  if (birth) return `b. ${year(birth)}`
  if (death) return `d. ${year(death)}`
  return ''
}

// "3 hours ago", "12 Mar 2026"
export const timeAgo = (d) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Cloudinary images can be resized on the fly, so lists download small thumbnails instead of full photos
export const img = (url, w, h) => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  const t = ['f_auto', 'q_auto', h ? `c_fill,w_${w},h_${h},g_auto` : `c_limit,w_${w}`].join(',')
  return url.replace('/upload/', `/upload/${t}/`)
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// How `other` is related to the person whose page we are on, in everyday words ("mother", "son", "wife")
const WORDS = {
  parent: { female: 'mother', male: 'father', '': 'parent' },
  child: { female: 'daughter', male: 'son', '': 'child' },
  spouse: { female: 'wife', male: 'husband', '': 'spouse' },
  sibling: { female: 'sister', male: 'brother', '': 'sibling' },
}
export function relationTo(personId, rel) {
  const meIsSource = String(rel.source?._id || rel.source) === String(personId)
  const other = meIsSource ? rel.target : rel.source
  // rel says "source is the <type> of target"; flip it when we are the target
  let kind = rel.type
  if (meIsSource) kind = { parent: 'child', child: 'parent', spouse: 'spouse', sibling: 'sibling' }[rel.type]
  const g = other?.gender === 'other' ? '' : other?.gender || ''
  return { other, kind, word: WORDS[kind][g] }
}
