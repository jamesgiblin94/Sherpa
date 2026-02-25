import { useState } from 'react'
import { signIn, signUp } from '../utils/supabase'
import { track } from '../utils/analytics'

export default function WelcomeModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('welcome') // 'welcome' | 'signup' | 'signin'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const handle = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        track('sign_up', { method: 'email' })
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
      } else {
        await signIn(email, password)
        track('sign_in', { method: 'email' })
        onSuccess()
        onClose()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 mb-4 sm:mb-0 relative rounded-2xl overflow-hidden"
           style={{ background: '#1a2020', border: '1px solid rgba(127,182,133,0.3)' }}>

        {/* Close */}
        <button
          className="absolute top-3 right-3 text-lg z-10 transition-colors"
          style={{ color: '#7a7870' }}
          onMouseEnter={e => e.target.style.color = '#7fb685'}
          onMouseLeave={e => e.target.style.color = '#7a7870'}
          onClick={onClose}
        >✕</button>

        {/* ── WELCOME SCREEN ── */}
        {mode === 'welcome' && (
          <div>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center"
                 style={{ background: 'linear-gradient(135deg, rgba(127,182,133,0.12) 0%, rgba(127,182,133,0.04) 100%)', borderBottom: '1px solid rgba(127,182,133,0.15)' }}>
              <div className="text-3xl mb-2">🧭</div>
              <h2 className="font-serif text-xl mb-1" style={{ color: '#f0ede8' }}>
                Plan your next trip with Sherpa
              </h2>
              <p className="text-sm" style={{ color: '#7a7870' }}>
                AI-powered itineraries built around your actual flights, hotel and budget
              </p>
            </div>

            {/* Features */}
            <div className="px-6 py-4 space-y-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { icon: '✨', text: 'Personalised destination suggestions' },
                { icon: '🗓️', text: 'Day-by-day itineraries with real restaurants' },
                { icon: '📍', text: 'Interactive map of every location' },
                { icon: '💾', text: 'Save and revisit your trips anytime' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center shrink-0">{icon}</span>
                  <p className="text-sm" style={{ color: '#c8c4bc' }}>{text}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="px-6 py-5 space-y-3">
              <button
                className="btn-primary w-full py-3 text-sm"
                onClick={() => setMode('signup')}
              >
                Create free account
              </button>
              <button
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'transparent', color: '#7fb685', border: '1px solid rgba(127,182,133,0.3)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(127,182,133,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                onClick={() => setMode('signin')}
              >
                Sign in to existing account
              </button>
              <button
                className="w-full text-xs py-1 transition-colors"
                style={{ color: '#7a7870' }}
                onMouseEnter={e => e.target.style.color = '#a0a098'}
                onMouseLeave={e => e.target.style.color = '#7a7870'}
                onClick={onClose}
              >
                Continue without an account
              </button>
            </div>
          </div>
        )}

        {/* ── SIGNUP / SIGNIN FORM ── */}
        {(mode === 'signup' || mode === 'signin') && (
          <div className="px-6 py-6">

            {/* Back button */}
            <button
              className="flex items-center gap-1.5 text-xs mb-4 transition-colors"
              style={{ color: '#7a7870' }}
              onMouseEnter={e => e.currentTarget.style.color = '#7fb685'}
              onMouseLeave={e => e.currentTarget.style.color = '#7a7870'}
              onClick={() => { setMode('welcome'); setError(''); setSuccess('') }}
            >
              ← Back
            </button>

            <h2 className="font-serif text-xl mb-1" style={{ color: '#f0ede8' }}>
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm mb-5" style={{ color: '#7a7870' }}>
              {mode === 'signup'
                ? 'Sign in to save your trips and access them from any device.'
                : 'Sign in to access your saved trips.'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                />
              </div>
            </div>

            {error   && <p className="text-red-400 text-sm mt-3">{error}</p>}
            {success && <p className="text-green-400 text-sm mt-3">{success}</p>}

            <button
              className="btn-primary w-full mt-4 py-3"
              onClick={handle}
              disabled={loading || !email || !password}
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>

            <p className="text-center text-sm mt-4" style={{ color: '#7a7870' }}>
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <button
                className="transition-colors"
                style={{ color: '#7fb685' }}
                onMouseEnter={e => e.target.style.color = '#a8c9ad'}
                onMouseLeave={e => e.target.style.color = '#7fb685'}
                onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
