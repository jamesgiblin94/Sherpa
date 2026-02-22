import { useState, useEffect } from 'react'

export default function SherpaSpinner({ messages = ['Working…'] }) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2500)
    return () => clearInterval(t)
  }, [messages.length])

  return (
    <div className="flex flex-col items-center py-8 gap-5">
      {/* Three pulsing dots */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#7fb685',
              opacity: 0.8,
              animation: `sherpa-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Rotating message */}
      <p className="text-sm tracking-wide text-center" style={{ color: '#7a7870', fontStyle: 'italic' }}>
        {messages[msgIdx]}
      </p>

      <style>{`
        @keyframes sherpa-pulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
