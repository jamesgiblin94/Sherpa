import { useState } from 'react'
import { signIn, signUp } from '../utils/supabase'

export default function AuthModal({ onClose, onSuccess }) {
  const [mode,     setMode]     = useState('signin') // 'signin' | 'signup'
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
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
      } else {
        await signIn(email, password)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card-gold w-full max-w-sm mx-4 relative">
        <button
          className="absolute top-3 right-3 text-slate-3 hover:text-gold transition-colors text-lg"
          onClick={onClose}
        >✕</button>

        <h2 className="font-serif text-xl text-gold-light mb-1">
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-sm text-slate-3 mb-5">
          {mode === 'signin'
            ? 'Sign in to view and save your trips.'
            : 'Save itineraries and access them from any device.'}
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
          className="btn-primary w-full mt-4"
          onClick={handle}
          disabled={loading || !email || !password}
        >
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <p className="text-center text-sm text-slate-3 mt-4">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="text-gold hover:text-gold-light transition-colors"
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
