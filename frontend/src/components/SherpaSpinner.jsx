import { useState, useEffect } from 'react'

export default function SherpaSpinner({ messages = ['Sherpa is working…'] }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [step, setStep]     = useState(0)

  const path = [
    { x: 14, y: 86 },
    { x: 22, y: 72 },
    { x: 30, y: 58 },
    { x: 38, y: 46 },
    { x: 44, y: 36 },
  ]

  useEffect(() => {
    const t1 = setInterval(() => setStep(s => (s + 1) % path.length), 700)
    const t2 = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2400)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [messages.length])

  const pos = path[step]

  return (
    <div className="flex flex-col items-center py-6 gap-3">
      {/* Mountain SVG */}
      <div className="relative w-36 h-24">
        <svg width="144" height="96" viewBox="0 0 144 96" className="absolute inset-0">
          {/* Back mountain */}
          <polygon points="104,8 144,92 64,92" fill="#1a2a3a" />
          <polygon points="104,8 120,36 88,36" fill="#c9a84c" opacity="0.3" />
          {/* Main mountain */}
          <polygon points="54,6 126,92 0,92" fill="#243547" />
          <polygon points="54,6 74,34 34,34" fill="#e8e0d5" opacity="0.85" />
          {/* Path dots */}
          <polyline
            points="14,82 22,68 30,55 38,43 44,34"
            stroke="#c9a84c" strokeWidth="1.4" strokeDasharray="4,3"
            fill="none" opacity="0.55"
          />
        </svg>
        {/* Sherpa figure — positioned via JS for smooth movement */}
        <div
          className="absolute text-lg transition-all duration-700 ease-in-out select-none"
          style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
        >
          🧗
        </div>
      </div>

      {/* Rotating message */}
      <p className="text-sm text-gold italic tracking-wide text-center max-w-xs min-h-5 transition-opacity duration-300">
        {messages[msgIdx]}
      </p>
    </div>
  )
}
