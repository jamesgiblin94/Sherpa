import { useState } from 'react'

export default function UsageLimitModal({ type, onSignIn, onClose }) {
  const title = type === 'inspire'
    ? "You've used your free searches"
    : "You've used your free itinerary builds"

  const subtitle = type === 'inspire'
    ? 'Create a free account to unlock unlimited destination searches.'
    : 'Create a free account to unlock unlimited itinerary builds.'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
         onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
           style={{ background: '#1a2020', border: '1px solid rgba(127,182,133,0.2)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center"
             style={{ background: 'linear-gradient(to bottom, rgba(127,182,133,0.1), transparent)' }}>
          <div className="text-4xl mb-3">🏔️</div>
          <h2 className="font-serif text-xl" style={{ color: '#a8c9ad' }}>{title}</h2>
          <p className="text-sm mt-2" style={{ color: '#c8c4bc' }}>{subtitle}</p>
        </div>

        {/* Benefits */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#7a7870' }}>
            Why create an account?
          </p>
          {[
            { icon: '✨', text: 'Unlimited destination searches' },
            { icon: '🗓️', text: 'Unlimited personalised itineraries' },
            { icon: '💾', text: 'Save trips and revisit anytime' },
            { icon: '🎯', text: 'Personalised recommendations based on your profile' },
            { icon: '🗺️', text: 'Download your itinerary to Google Maps' },
            { icon: '🆓', text: "No payment needed" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-lg shrink-0">{icon}</span>
              <p className="text-sm" style={{ color: '#c8c4bc' }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 space-y-3">
          <button
            className="btn-primary w-full py-3 text-base"
            onClick={onSignIn}
          >
            Create free account →
          </button>
          <button
            className="w-full py-2 text-sm transition-colors"
            style={{ color: '#7a7870' }}
            onMouseEnter={e => e.target.style.color = '#a8c9ad'}
            onMouseLeave={e => e.target.style.color = '#7a7870'}
            onClick={onSignIn}
          >
            Already have an account? Sign in
          </button>
          <button
            className="w-full py-1 text-xs transition-colors"
            style={{ color: '#7a7870' }}
            onMouseEnter={e => e.target.style.color = '#a8c9ad'}
            onMouseLeave={e => e.target.style.color = '#7a7870'}
            onClick={onClose}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
