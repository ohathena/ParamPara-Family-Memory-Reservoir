// keep in sync with the backend (models/Memory.js)
export const CATEGORIES = ['Story', 'Recipe', 'Photograph', 'Letter', 'Family event', 'Tradition', 'Achievement', 'Other']

// one colour per category, shown as a small dot (quieter than coloured badges)
export const CATEGORY_DOT = {
  Story: '#2f4a8a',
  Recipe: '#c0612b',
  Photograph: '#3d6b4f',
  Letter: '#7a5c2e',
  'Family event': '#8c2232',
  Tradition: '#e2a23b',
  Achievement: '#6b4c9a',
  Other: '#8a8a94',
}

export const ROLE_INFO = {
  owner: 'Can do everything, including sharing and deleting the family',
  editor: 'Can add and edit people, relationships and memories',
  viewer: 'Can read everything and leave comments',
}

export const REL_TYPES = ['parent', 'child', 'spouse', 'sibling']
