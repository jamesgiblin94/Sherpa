import { useState, useRef, useEffect } from 'react'

export default function AccountMenu({ user, userProfile, onEditProfile, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const firstName = userProfile?.first_name || user.email.split('@')[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
        style={{
          background: open ? 'rgba(127,182,133,0.15)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(127,182,133,0.25)',
          color: '#f0ede8',
        }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
             style={{ background: '#7fb685', color: '#111614' }}>
          {firstName[0].toUpperCase()}
        </div>
        <span className="hidden sm:block">{firstName}</span>
        <span className="text-xs" style={{ color: '#7a7870' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden shadow-xl z-50"
             style={{ background: '#111614', border: '1px solid rgba(127,182,133,0.2)' }}>

          {/* User info */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-sm font-medium" style={{ color: '#f0ede8' }}>
              {userProfile?.first_name && userProfile?.last_name
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : firstName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#7a7870' }}>{user.email}</p>
          </div>

          {/* Profile summary */}
          {userProfile && (
            <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {userProfile.age_range && (
                <p className="text-xs mb-1" style={{ color: '#7a7870' }}>Age: <span style={{ color: '#a0a098' }}>{userProfile.age_range}</span></p>
              )}
              {userProfile.activity_level && (
                <p className="text-xs mb-1" style={{ color: '#7a7870' }}>
                  Activity: <span style={{ color: '#a0a098' }}>
                    {['', 'Very relaxed', 'Gentle', 'Balanced', 'Active', 'Very active'][userProfile.activity_level]}
                  </span>
                </p>
              )}
              {userProfile.dietary?.length > 0 && (
                <p className="text-xs" style={{ color: '#7a7870' }}>
                  Diet: <span style={{ color: '#a0a098' }}>{userProfile.dietary.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => { setOpen(false); onEditProfile() }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
              style={{ color: '#c8c4bc' }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}>
              Edit profile
            </button>
            <button
              onClick={() => { setOpen(false); onSignOut() }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
              style={{ color: '#a0a098' }}
              onMouseEnter={e => e.target.style.color = '#f0ede8'}
              onMouseLeave={e => e.target.style.color = '#a0a098'}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
