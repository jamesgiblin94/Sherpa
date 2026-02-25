import { useState } from 'react'
import { supabase } from '../utils/supabase'

const TYPES = [
  { value: 'bug',     label: '🐛 Bug report',      desc: 'Something broken or not working right' },
  { value: 'feature', label: '💡 Feature request',  desc: 'Something you\'d love to see added' },
  { value: 'general', label: '💬 General feedback',  desc: 'Anything else on your mind' },
]

export default function FeedbackModal({ onClose, user }) {
  const [type, setType]       = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async () => {
    if (!type || !message.trim()) return
    setSending(true)
    setError('')
    try {
      const { error: err } = await supabase.from('feedback').insert({
        type,
        message: message.trim(),
        email: user?.email || email.trim() || null,
        user_id: user?.id || null,
      })
      if (err) throw err
      setSent(true)
    } catch (e) {
      setError('Could not send feedback. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card-gold w-full max-w-md mx-4 relative">
        <button
          className="absolute top-3 right-3 text-slate-3 hover:text-sage transition-colors text-lg"
          onClick={onClose}
        >✕</button>

        {sent ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🎉</p>
            <h2 className="font-serif text-xl text-sage-light mb-2">Thanks for your feedback!</h2>
            <p className="text-sm text-slate-3 mb-4">
              We read every message and it genuinely helps us make Sherpa better.
            </p>
            <button className="btn-primary px-8" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl text-sage-light mb-1">Help us improve Sherpa</h2>
            <p className="text-sm text-slate-3 mb-5">
              Sherpa is brand new and we're actively building. Found a bug? Want a feature? 
              Your feedback shapes what we work on next.
            </p>

            <div className="space-y-4">
              {/* Type selection */}
              <div>
                <label className="label">What kind of feedback?</label>
                <div className="space-y-2">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
                      style={{
                        background: type === t.value ? 'rgba(127,182,133,0.12)' : 'transparent',
                        border: `1px solid ${type === t.value ? 'rgba(127,182,133,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <p className="text-sm font-medium" style={{color: type === t.value ? '#a8c9ad' : '#c8c4bc'}}>
                        {t.label}
                      </p>
                      <p className="text-xs" style={{color:'#7a7870'}}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="label">Tell us more</label>
                <textarea
                  className="input w-full"
                  rows={4}
                  placeholder={
                    type === 'bug' ? 'What happened? What did you expect to happen?'
                    : type === 'feature' ? 'What would you like Sherpa to do?'
                    : 'What\'s on your mind?'
                  }
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              {/* Email — only show if not signed in */}
              {!user && (
                <div>
                  <label className="label">Email <span className="normal-case font-normal text-slate-3">(optional, if you'd like a reply)</span></label>
                  <input
                    className="input w-full"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                className="btn-primary w-full"
                onClick={handleSubmit}
                disabled={sending || !type || !message.trim()}
              >
                {sending ? 'Sending...' : 'Send feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
