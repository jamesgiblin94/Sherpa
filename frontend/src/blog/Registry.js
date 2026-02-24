// ─────────────────────────────────────────────────────────────
// BLOG REGISTRY
// To add a new post:
//   1. Create folder: public/blog/[slug]/
//   2. Write post:    public/blog/[slug]/index.md
//   3. Add one entry below
// That's it. Photos go in the same folder as the markdown.
// ─────────────────────────────────────────────────────────────

export const posts = [
  {
  slug:        '3-days-in-athens',
  title:       '3 Days in Athens — Ancient Ruins, Rooftop Views & Incredible Food',
  description: 'A long-weekend itinerary for first-timers exploring Athens on a budget, from the Acropolis to the best souvlaki in Monastiraki.',
  date:        '2026-02-23',
  author:      'Kate',
  destination: 'Athens',
  country:     'Greece',
  emoji:       '🇬🇷',
  coverImage:  '/blog/3-days-in-athens/parthenon-crowds.jpg',
  tags:        ['Greece', 'City Break', 'Culture', 'Food'],
  readTime:    7,
},
    {
    slug:        'lisbon-4-days',
    title:       '4 Days in Lisbon — The Perfect Long Weekend',
    description: "Everything you need for a long weekend in one of Europe's most underrated cities. Where to stay, eat, and what to actually do with 4 days in Lisbon.",
    date:        '2026-02-22',
    author:      'James',
    destination: 'Lisbon',
    country:     'Portugal',
    emoji:       '🇵🇹',
    coverImage:  '/blog/lisbon-4-days/cover.jpg',
    tags:        ['Portugal', 'City Break', 'Weekend', 'Food', 'Budget'],
    readTime:    7,
  },

  // ── ADD NEW POSTS HERE ──────────────────────────────────────
  // {
  //   slug:        'porto-weekend',
  //   title:       'A Weekend in Porto',
  //   description: '...',
  //   date:        '2026-03-01',
  //   author:      'James',
  //   destination: 'Porto',
  //   country:     'Portugal',
  //   emoji:       '🇵🇹',
  //   coverImage:  '/blog/porto-weekend/cover.jpg',
  //   tags:        ['Portugal', 'Weekend', 'Food'],
  //   readTime:    5,
  // },
]

export const getPost     = (slug) => posts.find(p => p.slug === slug)
export const getByTag    = (tag)  => posts.filter(p => p.tags.includes(tag))
export const getAllTags   = ()    => [...new Set(posts.flatMap(p => p.tags))].sort()
