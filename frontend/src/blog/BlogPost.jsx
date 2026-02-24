import '/src/index.css'
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getPost } from './registry'

export default function BlogPost() {
  const { slug }            = useParams()
  const navigate            = useNavigate()
  const post                = getPost(slug)
  const [md, setMd]         = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!post) return
    fetch(`/blog/${slug}/index.md`)
      .then(r => r.text())
      .then(text => {
        const stripped = text.replace(/^---[\s\S]*?---\n/, '')
        setMd(stripped)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  if (!post) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#111614'}}>
      <div className="text-center">
        <p className="text-4xl mb-4">🗺️</p>
        <p className="font-serif text-xl mb-3" style={{color:'#f0ede8'}}>Post not found</p>
        <Link to="/blog" style={{color:'#7fb685'}}>← Back to blog</Link>
      </div>
    </div>
  )

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })

  return (
    <div className="min-h-screen" style={{background:'#111614'}}>
      <div className="sticky top-0 z-50 border-b" style={{background:'rgba(17,22,20,0.95)', backdropFilter:'blur(12px)', borderColor:'rgba(127,182,133,0.15)'}}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-xl" style={{color:'#7fb685'}}>Sherpa</Link>
          <Link to="/blog" className="text-sm" style={{color:'#7a7870'}}>← Blog</Link>
        </div>
      </div>

      <div className="w-full relative" style={{height:420}}>
        <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" style={{filter:'brightness(0.55)'}} onError={e => e.target.parentElement.style.background='#1a2020'} />
        <div className="absolute inset-0" style={{background:'linear-gradient(to top, #111614 0%, transparent 55%)'}} />
      </div>

      <div className="max-w-3xl mx-auto px-4">
        <div className="-mt-28 relative z-10 mb-10">
          <div className="flex gap-2 mb-4 flex-wrap">
            {post.tags.map(tag => (<span key={tag} className="text-xs px-2.5 py-1 rounded-full" style={{background:'rgba(127,182,133,0.15)', color:'#7fb685', border:'1px solid rgba(127,182,133,0.3)'}}>{tag}</span>))}
          </div>
          <h1 className="font-serif mb-4" style={{color:'#f0ede8', fontSize:'2rem', lineHeight:1.2}}>{post.title}</h1>
          <p className="text-base mb-6" style={{color:'#a0a098'}}>{post.description}</p>
          <div className="flex items-center gap-3 pb-8 border-b" style={{borderColor:'rgba(255,255,255,0.08)'}}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold" style={{background:'rgba(127,182,133,0.2)', color:'#7fb685'}}>{post.author[0]}</div>
            <div>
              <p className="text-sm font-medium" style={{color:'#f0ede8'}}>{post.author}</p>
              <p className="text-xs" style={{color:'#7a7870'}}>{fmtDate(post.date)} · {post.readTime} min read</p>
            </div>
          </div>
        </div>

        <SherpaCTA post={post} navigate={navigate} />

        {loading ? (
          <div className="py-12 text-center" style={{color:'#7a7870'}}>Loading…</div>
        ) : (
          <div className="pb-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents(post.slug)}>{md}</ReactMarkdown>
          </div>
        )}

        <SherpaCTA post={post} navigate={navigate} footer />

        <div className="py-12 text-center">
          <Link to="/blog" className="text-sm" style={{color:'#7a7870'}}>← More from the blog</Link>
        </div>
      </div>
    </div>
  )
}

function SherpaCTA({ post, navigate, footer }) {
  return (
    <div className={`rounded-2xl p-6 text-center ${footer ? 'mb-16 mt-8' : 'mb-10'}`} style={{background:'rgba(127,182,133,0.07)', border:'1px solid rgba(127,182,133,0.25)'}}>
      <p className="font-serif text-xl mb-1" style={{color:'#f0ede8'}}>{post.emoji} Ready to plan your {post.destination} trip?</p>
      <p className="text-sm mb-4" style={{color:'#a0a098'}}>Sherpa builds you a personalised day-by-day itinerary in seconds — free to use.</p>
      <button onClick={() => navigate(`/?dest=${encodeURIComponent(post.destination)}&country=${encodeURIComponent(post.country)}&emoji=${encodeURIComponent(post.emoji)}`)} className="btn-primary px-8 py-3 text-base">
        Build my {post.destination} itinerary →
      </button>
    </div>
  )
}

const markdownComponents = (slug) => ({
  h2: ({children}) => <h2 className="font-serif text-2xl mt-10 mb-4" style={{color:'#f0ede8'}}>{children}</h2>,
  h3: ({children}) => <h3 className="font-serif text-xl mt-8 mb-3" style={{color:'#f0ede8'}}>{children}</h3>,
  p:  ({children}) => <p className="text-base leading-relaxed mb-5" style={{color:'#c8c4bc'}}>{children}</p>,
  strong: ({children}) => <strong style={{color:'#f0ede8', fontWeight:600}}>{children}</strong>,
  blockquote: ({children}) => (
    <div className="my-6 rounded-xl px-5 py-4" style={{background:'rgba(127,182,133,0.08)', border:'1px solid rgba(127,182,133,0.25)'}}>
      <div className="text-sm leading-relaxed" style={{color:'#a8c9ad'}}>{children}</div>
    </div>
  ),
  img: ({src, alt}) => {
    const imgSrc = src.startsWith('http') ? src : `/blog/${slug}/${src}`
    return (
      <figure className="my-8 -mx-4">
        <img src={imgSrc} alt={alt} className="w-full object-cover rounded-xl" style={{maxHeight:480, filter:'brightness(0.92)'}} />
        {alt && <figcaption className="text-xs text-center mt-2" style={{color:'#7a7870'}}>{alt}</figcaption>}
      </figure>
    )
  },
  table:  ({children}) => <div className="my-6 rounded-xl overflow-hidden" style={{border:'1px solid rgba(127,182,133,0.2)'}}><table className="w-full text-sm">{children}</table></div>,
  td:     ({children}) => <td className="px-4 py-2.5 border-b" style={{color:'#c8c4bc', borderColor:'rgba(255,255,255,0.05)'}}>{children}</td>,
  tr:     ({children}) => <tr style={{background:'#1a2020'}}>{children}</tr>,
  ul:     ({children}) => <ul className="mb-5 space-y-1.5 pl-1" style={{color:'#c8c4bc'}}>{children}</ul>,
  li:     ({children}) => <li className="text-base leading-relaxed flex gap-2"><span style={{color:'#7fb685'}}>—</span><span>{children}</span></li>,
  hr:     ()           => <div className="my-10 border-t" style={{borderColor:'rgba(127,182,133,0.15)'}} />,
})
