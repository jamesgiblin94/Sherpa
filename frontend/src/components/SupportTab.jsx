import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../utils/api'
import SherpaSpinner from './SherpaSpinner'

function TripSummary({ prefs, chosenDest, flightDetails, carHire, selectedHotel }) {
  if (!chosenDest) return null
  const fd = flightDetails

  const fmt = (iso) => {
    if (!iso) return null
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  }

  const rows = [
    ['📍 Destination', `${chosenDest.EMOJI || ''} ${chosenDest.CITY}${chosenDest.COUNTRY ? ', '+chosenDest.COUNTRY : ''}`],
    ['🛫 Flying from',  prefs.startingPoint],
    fd.outboundDate && ['📅 Dates', `${fmt(fd.outboundDate)} → ${fmt(fd.returnDate)}`],
    fd.arrivalTime && ['⏰ Arrival / departure', `${fd.arrivalTime} in / ${fd.departureTime} out`],
    ['💰 Budget', prefs.budget],
    ['👥 Group', `${prefs.groupType} (${prefs.numAdults} adults)`],
    carHire.confirmed && ['🚗 Car hire', carHire.confirmed === 'yes' ? 'Yes' : 'No'],
    selectedHotel && ['🏨 Staying at', selectedHotel],
  ].filter(Boolean)

  return (
    <div className="card-gold">
      <h3 className="font-serif text-gold-light mb-3">📋 Your Trip Summary</h3>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <span className="text-slate-3 w-40 shrink-0">{label}</span>
            <span className="text-slate">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatPanel({ prefs, chosenDest, itinerary }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Sherpa, your travel assistant. Ask me anything about your trip — local tips, what to pack, currency, safety, or anything else." }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const context = [
    chosenDest && `Destination: ${chosenDest.CITY}, ${chosenDest.COUNTRY}`,
    `Budget: ${prefs.budget}`,
    `Group: ${prefs.groupType}`,
    itinerary && `Itinerary summary: ${itinerary.slice(0, 600)}`,
  ].filter(Boolean).join('. ')

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    const updated = [...messages, { role: 'user', content: msg }]
    setMessages(updated)
    setLoading(true)
    try {
      const history = updated.slice(1).map(m => ({ role: m.role, content: m.content }))
      const data = await api.chat({ message: msg, history: history.slice(0,-1), context })
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card flex flex-col" style={{ minHeight: 360 }}>
      <h3 className="font-serif text-gold-light mb-3">💬 Ask Sherpa</h3>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: 340 }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-sm rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-gold/20 text-gold-light rounded-br-sm'
                : 'bg-navy-3 text-slate rounded-bl-sm'
            }`}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-navy-3 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="text-slate-3 text-sm italic">Sherpa is thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask anything about your trip…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button className="btn-primary px-5" onClick={send} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

function LocalGuidePanel({ chosenDest }) {
  const [loading,  setLoading]  = useState(false)
  const [nearby,   setNearby]   = useState(null)
  const [history,  setHistory]  = useState('')
  const [error,    setError]    = useState('')
  const [locating, setLocating] = useState(false)

  const getLocation = () => {
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false)
        setLoading(true)
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const [nearbyData, histData] = await Promise.all([
            api.nearby({ lat, lon, dest_city: chosenDest?.CITY || '' }),
            api.history({ lat, lon, dest_city: chosenDest?.CITY || '' }),
          ])
          setNearby(nearbyData.places || [])
          setHistory(histData.history || '')
        } catch {
          setError('Could not fetch local guide. Try again.')
        } finally {
          setLoading(false)
        }
      },
      () => { setLocating(false); setError('Location permission denied.') }
    )
  }

  const typeIcon = {
    Restaurant:'🍽️', Cafe:'☕', Bar:'🍸', Pub:'🍺',
    Attraction:'⭐', Market:'🛒', Park:'🌿', Viewpoint:'👁️',
  }

  return (
    <div className="card">
      <h3 className="font-serif text-gold-light mb-1">🧭 Local Guide</h3>
      <p className="text-sm text-slate-3 mb-4">Use your GPS location to discover what's nearby and learn the local history.</p>

      {!nearby && !loading && (
        <button className="btn-primary w-full" onClick={getLocation} disabled={locating}>
          {locating ? 'Getting your location…' : '📍 Find what\'s nearby'}
        </button>
      )}

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {loading && <SherpaSpinner messages={["Finding what's around you…","Checking nearby spots…","Reading the history…"]} />}

      {nearby !== null && !loading && (
        <div className="space-y-4">
          {history && (
            <div className="note">
              <p className="section-label mb-1">📜 Local history</p>
              <p className="text-sm text-slate leading-relaxed">{history}</p>
            </div>
          )}

          <div>
            <p className="section-label">📍 Nearby ({nearby.length} places)</p>
            <div className="space-y-2 mt-2">
              {nearby.map((p,i) => (
                <div key={i} className="flex gap-3 items-start py-2 border-b border-white/8 last:border-0">
                  <span className="text-xl">{typeIcon[p.type] || '📍'}</span>
                  <div>
                    <p className="text-sm font-medium text-slate">{p.name}</p>
                    <p className="text-xs text-slate-3">{p.distance} · {p.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-secondary text-sm w-full" onClick={getLocation}>
            🔄 Refresh location
          </button>
        </div>
      )}
    </div>
  )
}

export default function SupportTab({ prefs, chosenDest, itinerary, flightDetails, carHire, selectedHotel }) {
  return (
    <div className="space-y-6">
      <TripSummary
        prefs={prefs}
        chosenDest={chosenDest}
        flightDetails={flightDetails}
        carHire={carHire}
        selectedHotel={selectedHotel}
      />

      <ChatPanel
        prefs={prefs}
        chosenDest={chosenDest}
        itinerary={itinerary}
      />

      <LocalGuidePanel chosenDest={chosenDest} />
    </div>
  )
}
