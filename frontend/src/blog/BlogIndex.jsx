import '/src/index.css'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { posts, getAllTags } from './Registry'

export default function BlogIndex() {
  const [activeTag, setActiveTag] = useState(null)
  const allTags = getAllTags()
  const filtered = activeTag ? posts.filter(p => p.tags.includes(activeTag)) : posts
  const fmtDate  = (iso) => new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })

  return (
    <div className="min-h-screen" style={{background:'#111614'}}>
      <div className="sticky top-0 z-50 border-b" style={{background:'rgba(17,22,20,0.95)', backdropFilter:'blur(12px)', borderColor:'rgba(127,182,133,0.15)'}}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-xl" style={{color:'#7fb685'}}>Sherpa</Link>
          <Link to="/" className="text-sm" style={{color:'#7a7870'}}>← Back to app</Link>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 pt-14 pb-10">
        <p className="text-xs uppercase tracking-widest mb-3" style={{color:'#7fb685'}}>Travel Blog</p>
        <h1 className="font-serif text-4xl mb-4" style={{color:'#f0ede8', lineHeight:1.2}}>Real trips.<br />Honest guides.</h1>
        <p className="text-lg" style={{color:'#a0a098'}}>Written by people who've actually been there — with photos to prove it.</p>
      </div>
      {allTags.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 pb-8 flex gap-2 flex-wrap">
          <button onClick={() => setActiveTag(null)} className="text-xs px-3 py-1.5 rounded-full" style={{background: !activeTag ? '#7fb685' : 'rgba(127,182,133,0.08)', color: !activeTag ? '#111614' : '#7a7870', border: !activeTag ? 'none' : '1px solid rgba(127,182,133,0.2)'}}>All</button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag === activeTag ? null : tag)} className="text-xs px-3 py-1.5 rounded-full" style={{background: activeTag===tag ? '#7fb685' : 'rgba(127,182,133,0.08)', color: activeTag===tag ? '#111614' : '#7a7870', border: activeTag===tag ? 'none' : '1px solid rgba(127,182,133,0.2)'}}>
              {tag}
            </button>
          ))}
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 pb-24 space-y-6">
        {filtered.map(post => (
          <Link key={post.slug} to={`/blog/${post.slug}`} className="block group">
            <div className="rounded-2xl overflow-hidden transition-all duration-200" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.1)'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(127,182,133,0.3)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(127,182,133,0.1)'}>
              <div className="overflow-hidden" style={{height:220}}>
                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{filter:'brightness(0.8)'}} onError={e => { e.target.parentElement.style.background='#222b28'; e.target.style.display='none' }} />
              </div>
              <div className="p-6">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {post.tags.map(tag => (<span key={tag} className="text-xs px-2.5 py-1 rounded-full" style={{background:'rgba(127,182,133,0.1)', color:'#7fb685', border:'1px solid rgba(127,182,133,0.2)'}}>{tag}</span>))}
                </div>
                <h2 className="font-serif text-xl mb-2" style={{color:'#f0ede8', lineHeight:1.3}}>{post.title}</h2>
                <p className="text-sm mb-5 leading-relaxed" style={{color:'#a0a098'}}>{post.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{background:'rgba(127,182,133,0.15)', color:'#7fb685'}}>{post.author[0]}</div>
                    <span className="text-xs" style={{color:'#7a7870'}}>{post.author} · {fmtDate(post.date)}</span>
                  </div>
                  <span className="text-xs" style={{color:'#7a7870'}}>{post.readTime} min read</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
