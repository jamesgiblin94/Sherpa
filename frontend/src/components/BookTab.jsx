import { useState, useEffect, useRef } from 'react'
import { saveTrip } from '../utils/supabase'
import ReactMarkdown from 'react-markdown'
import ItineraryModal from './ItineraryModal'
import DatePicker from 'react-datepicker'
import { api } from '../utils/api'
import SherpaSpinner from './SherpaSpinner'

// ── Small reusable pieces ────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <h2 className="font-serif text-xl text-gold-light mb-4">{title}</h2>
      {children}
    </div>
  )
}

function TimeSelect({ label, value, onChange }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const mins  = ['00', '15', '30', '45']
  const [h, m] = (value || '10:00').split(':')
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <select className="select w-20" value={h}
          onChange={e => onChange(`${e.target.value}:${m}`)}>
          {hours.map(hh => <option key={hh} value={String(hh).padStart(2,'0')}>{String(hh).padStart(2,'0')}</option>)}
        </select>
        <select className="select w-20" value={m}
          onChange={e => onChange(`${h}:${e.target.value}`)}>
          {mins.map(mm => <option key={mm} value={mm}>{mm}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Flight section ───────────────────────────────────────────────────────────

function FlightSection({ prefs, dest, flightDetails, setFlightDetails }) {
  const [airports, setAirports] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [depart,   setDepart]   = useState(flightDetails.outboundDate ? new Date(flightDetails.outboundDate) : null)
  const [ret,      setRet]      = useState(flightDetails.returnDate   ? new Date(flightDetails.returnDate)   : null)
  const [selAp,    setSelAp]    = useState(flightDetails.selectedAirport || null)

  const originSky = (() => {
    const map = { london:'LOND', heathrow:'LHR', gatwick:'LGW', stansted:'STN', luton:'LTN',
      'london city':'LCY', southend:'SEN', manchester:'MAN', birmingham:'BHX', edinburgh:'EDI',
      glasgow:'GLAS', prestwick:'PIK', bristol:'BRS', leeds:'LBA', newcastle:'NCL', liverpool:'LPL',
      cardiff:'CWL', belfast:'BELF', southampton:'SOU', norwich:'NWI', exeter:'EXT',
      'east midlands':'EMA', aberdeen:'ABZ', inverness:'INV', doncaster:'DSA', bournemouth:'BOH',
      teesside:'MME', newquay:'NQY', jersey:'JER', guernsey:'GCI', 'isle of man':'IOM' }
    return map[prefs.startingPoint] || 'LOND'
  })()

  useEffect(() => {
    if (!dest) return
    setLoading(true)
    api.getDestAirports({ dest_city: dest.CITY })
       .then(aps => { setAirports(aps); setSelAp(aps[0] || null) })
       .catch(() => {})
       .finally(() => setLoading(false))
  }, [dest?.CITY])

  const fmt = d => d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : ''
  const yymmdd = d => d ? `${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}` : ''

  const skyUrl = (ap) => {
    if (!depart || !ret) return '#'
    return `https://www.skyscanner.net/transport/flights/${originSky.toLowerCase()}/${(ap.sky||ap.iata||'').toLowerCase()}/${yymmdd(depart)}/${yymmdd(ret)}/?adults=${prefs.numAdults}`
  }

  const saveFlights = () => {
    setFlightDetails(fd => ({
      ...fd,
      confirmed:      true,
      outboundDate:   depart?.toISOString().slice(0,10),
      returnDate:     ret?.toISOString().slice(0,10),
      selectedAirport: selAp,
    }))
  }

  if (!dest) return null

  return (
    <div className="space-y-4">
      {/* Date pickers */}
      <div className="card">
        <h3 className="font-medium text-slate mb-3">📅 Travel dates</h3>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="label">Depart</label>
            <DatePicker selected={depart} onChange={setDepart} dateFormat="dd/MM/yyyy"
              calendarStartDay={1} minDate={new Date()} className="input w-36" placeholderText="DD/MM/YYYY" />
          </div>
          <span className="text-slate-3 self-end pb-2.5">→</span>
          <div>
            <label className="label">Return</label>
            <DatePicker selected={ret} onChange={setRet} dateFormat="dd/MM/yyyy"
              calendarStartDay={1} minDate={depart || new Date()} className="input w-36" placeholderText="DD/MM/YYYY" />
          </div>
        </div>
      </div>

      {/* Airport options */}
      {loading && <div className="card"><SherpaSpinner messages={['Finding airports…']} /></div>}

      {!loading && airports.map((ap, i) => {
        const legs = ap.transfer_legs || []
        const carLeg = legs.filter(l => ['Car','Taxi'].includes(l.mode))
        const ptLeg  = legs.filter(l => !['Car','Taxi'].includes(l.mode))
        const modeIcon = {Train:'🚆',Metro:'🚇',Bus:'🚌',Taxi:'🚕',Walk:'🚶',Ferry:'⛴️',Tram:'🚊',Shuttle:'🚐',Car:'🚗'}

        return (
          <div key={i} className="card-gold">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gold-light">
                  ✈️ {dest.CITY} → {ap.airport_name} ({ap.iata})
                </p>
                <div className="mt-2 space-y-1 text-sm text-slate">
                  {depart && ret && (
                    <p>📅 {fmt(depart)} → {fmt(ret)} · 👤 {prefs.numAdults} passenger(s)</p>
                  )}
                  {ap.flight_time && <p>✈️ Flight time: approx {ap.flight_time}</p>}
                  {carLeg.length > 0 && (
                    <p>🚗 By car/taxi: {carLeg.map(l => `${l.mins} min`).join(' + ')}</p>
                  )}
                  {ptLeg.length > 0 && (
                    <p>
                      🚇 By public transport: <span className="text-gold font-medium">{ap.transfer_mins} min</span>
                      {' — '}{ptLeg.map(l => `${modeIcon[l.mode]||'🚌'} ${l.mode} ${l.mins}min`).join(' → ')}
                    </p>
                  )}
                  {!legs.length && ap.transfer_label && (
                    <p>🚌 Transfer to centre: {ap.transfer_label}</p>
                  )}
                </div>
              </div>
              <a
                href={skyUrl(ap)}
                target="_blank" rel="noopener noreferrer"
                className="btn-primary text-sm whitespace-nowrap shrink-0"
              >
                Search Skyscanner →
              </a>
            </div>
          </div>
        )
      })}

      {/* Airport selector for itinerary */}
      {airports.length > 1 && (
        <div className="card">
          <label className="label">🛬 Which airport are you flying into?</label>
          <select className="select" value={selAp?.iata || ''} onChange={e => setSelAp(airports.find(a => a.iata === e.target.value))}>
            {airports.map(ap => (
              <option key={ap.iata} value={ap.iata}>{ap.airport_name} ({ap.iata})</option>
            ))}
          </select>
        </div>
      )}

      {/* Confirm flight times */}
      <div className="card">
        <h3 className="font-medium text-slate mb-3">🛫 Confirm your flight times</h3>
        <p className="text-sm text-slate-3 mb-4">Once booked, enter your times so Sherpa can plan your itinerary around your schedule.</p>
        <div className="grid grid-cols-2 gap-4">
          <TimeSelect label="🛬 Arrival time"
            value={flightDetails.arrivalTime}
            onChange={v => setFlightDetails(fd => ({ ...fd, arrivalTime: v }))} />
          <TimeSelect label="🛫 Departure time"
            value={flightDetails.departureTime}
            onChange={v => setFlightDetails(fd => ({ ...fd, departureTime: v }))} />
        </div>
        <button className="btn-primary mt-4 w-full" onClick={saveFlights}>
          ✅ Save flight times
        </button>
        {flightDetails.confirmed && (
          <p className="text-green-400 text-sm mt-2 text-center">✓ Flight times saved</p>
        )}
      </div>
    </div>
  )
}

// ── Car hire section ─────────────────────────────────────────────────────────

function CarHireSection({ prefs, dest, flightDetails, carHire, setCarHire }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (carHire.data || !dest || prefs.transportMode.includes('public transport')) return
    setLoading(true)
    api.carHire({
      dest: `${dest.CITY}, ${dest.COUNTRY}`,
      dest_city: dest.CITY,
      trip_type: prefs.tripType,
      depart_date: flightDetails.outboundDate || '',
      return_date: flightDetails.returnDate   || '',
    })
    .then(data => setCarHire(c => ({ ...c, data })))
    .catch(() => {})
    .finally(() => setLoading(false))
  }, [dest?.CITY])

  if (prefs.transportMode.includes('public transport')) return null
  if (!dest) return null

  const ratingLabels = {1:'Not needed',2:'Rarely useful',3:'Moderately useful',4:'Quite important',5:'Essential'}
  const ratingColours= {1:'#2ecc71',2:'#8bc34a',3:'#f1c40f',4:'#e67e22',5:'#e74c3c'}
  const d = carHire.data || {}
  const score = d.rating || 3

  // Build Rentalcars URL from flight dates
  const rcUrl = (() => {
    const dep = flightDetails?.outboundDate
    const ret = flightDetails?.returnDate
    const params = new URLSearchParams({ pickup: dest?.CITY || '' })
    if (dep) params.set('puDate', dep)
    if (ret) params.set('doDate', ret)
    return `https://www.rentalcars.com/en/?${params.toString()}`
  })()

  return (
    <div className="space-y-4">
      {loading && <div className="card"><SherpaSpinner messages={['Checking car hire options…','Comparing rental companies…','Reading the reviews…']} /></div>}

      {!loading && carHire.data && (
        <>
          {/* 1. Rating card */}
          <div className="card-gold">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl">{'🚗'.repeat(score)}{'○'.repeat(5-score)}</div>
              <div>
                <p className="font-medium" style={{ color: ratingColours[score] }}>{ratingLabels[score]}</p>
                <p className="text-xs text-slate-3">Car hire usefulness for {dest.CITY}</p>
              </div>
            </div>
            <ul className="space-y-1">
              {d.reasons?.map((r,i) => <li key={i} className="text-sm text-slate flex gap-2"><span className="text-gold">•</span>{r}</li>)}
            </ul>
          </div>

          {/* 2. Yes/No toggle */}
          {carHire.confirmed === null && (
            <div className="card text-center">
              <p className="text-sm text-slate mb-3">Will you hire a car for this trip?</p>
              <div className="flex gap-3 justify-center">
                <button className="btn-primary px-8" onClick={() => setCarHire(c => ({ ...c, confirmed: 'yes' }))}>✅ Yes</button>
                <button className="btn-secondary px-8" onClick={() => setCarHire(c => ({ ...c, confirmed: 'no' }))}>✖ No</button>
              </div>
            </div>
          )}
          {carHire.confirmed !== null && (
            <div className="card text-center">
              <p className="text-slate">{carHire.confirmed === 'yes' ? '🚗 Car hire: Yes' : '🚇 Car hire: No'}</p>
              <button className="text-xs text-slate-3 hover:text-gold mt-2 transition-colors"
                onClick={() => setCarHire(c => ({ ...c, confirmed: null }))}>
                ↩ Change answer
              </button>
            </div>
          )}

          {/* 3. Rentalcars + recommendations — only show when yes confirmed */}
          {carHire.confirmed === 'yes' && (
            <>
              <a href={rcUrl} target="_blank" rel="noopener noreferrer"
                 className="btn-primary block text-center w-full">
                🚗 Compare prices on Rentalcars →
              </a>

              {d.companies?.length > 0 && (
                <div className="card">
                  <h4 className="text-sm font-semibold text-slate mb-3">✅ Recommended companies</h4>
                  <div className="space-y-2">
                    {d.companies.map((c,i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/8 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate">{c.name}</p>
                          <p className="text-xs text-slate-3">{c.highlight}</p>
                        </div>
                        <span className="badge">{c.rating}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {d.avoid?.length > 0 && (
                <div className="card" style={{border:'1px solid rgba(248,113,113,0.2)'}}>
                  <h4 className="text-sm font-semibold text-red-400 mb-2">⚠️ Worth avoiding</h4>
                  {d.avoid.map((c,i) => (
                    <div key={i} className="text-sm text-slate-3 flex gap-2 mt-1">
                      <span className="text-red-400">✗</span>
                      <span><strong className="text-slate">{c.name}</strong> ({c.rating}) — {c.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Accommodation section ────────────────────────────────────────────────────

function AccomSection({ prefs, dest, carHire, selectedHotel, setSelectedHotel, flightDetails }) {
  const [tips,    setTips]    = useState(null)
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [noteLoading, setNoteLoading] = useState(false)
  const [hotelInput, setHotelInput]   = useState(selectedHotel)

  const bkUrl = (() => {
    if (!dest) return '#'
    const params = new URLSearchParams({
      ss:           dest.CITY,
      lang:         'en-gb',
      // aid: '304142', // add when Booking.com affiliate approved
      group_adults: prefs.numAdults || 2,
      no_rooms:     1,
    })
    if (flightDetails?.outboundDate) params.set('checkin',  flightDetails.outboundDate)
    if (flightDetails?.returnDate)   params.set('checkout', flightDetails.returnDate)
    return `https://www.booking.com/searchresults.html?${params.toString()}`
  })()

  useEffect(() => {
    if (!dest || tips) return
    setLoading(true)
    api.accomTips({
      dest: `${dest.CITY}, ${dest.COUNTRY}`,
      dest_city: dest.CITY,
      budget: prefs.budget,
      group_type: prefs.groupType,
      trip_type: prefs.tripType,
      priorities: prefs.priorities,
      car_hire: carHire.confirmed,
    })
    .then(setTips)
    .catch(() => {})
    .finally(() => setLoading(false))
  }, [dest?.CITY, carHire.confirmed])

  const lookupHotel = async (name) => {
    if (!name.trim() || !dest) return
    setNoteLoading(true)
    try {
      const d = await api.hotelNote({
        hotel: name,
        dest_city: dest.CITY,
        dest: `${dest.CITY}, ${dest.COUNTRY}`,
        group_type: prefs.groupType,
        car_hire: carHire.confirmed,
        priorities: prefs.priorities,
      })
      setNote(d.note)
    } catch {}
    finally { setNoteLoading(false) }
  }

  if (!dest) return null

  return (
    <div className="space-y-4">
      <a href={bkUrl} target="_blank" rel="noopener noreferrer" className="btn-primary block text-center w-full">
        🏨 Explore hotels on Booking.com →
      </a>

      {loading && <div className="card"><SherpaSpinner messages={['Scouting the best areas…','Checking transport links…','Finding hidden gems…']} /></div>}

      {!loading && tips && (
        <>
          {tips.areas?.length > 0 && (
            <div className="card">
              <h4 className="text-sm font-semibold text-slate mb-3">📍 Best areas to stay</h4>
              <div className="space-y-3">
                {tips.areas.map((a,i) => (
                  <div key={i} className="border-l-2 border-gold/40 pl-3">
                    <div className="flex items-baseline justify-between">
                      <p className="font-medium text-slate">{a.name}</p>
                      <span className="text-xs text-slate-3">{a.price_range}</span>
                    </div>
                    <p className="text-xs text-gold italic">{a.vibe}</p>
                    <p className="text-xs text-slate-3 mt-0.5">{a.best_for}</p>
                    {a.tip && <p className="text-xs text-slate mt-1">💡 {a.tip}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tips.booking_tips?.length > 0 && (
            <div className="card">
              <h4 className="text-sm font-semibold text-slate mb-2">💡 Booking tips</h4>
              <ul className="space-y-1.5">
                {tips.booking_tips.map((t,i) => <li key={i} className="text-sm text-slate flex gap-2"><span className="text-gold">•</span>{t}</li>)}
              </ul>
              {tips.avoid && <p className="text-sm text-red-400/80 mt-3 flex gap-2"><span>⚠️</span>{tips.avoid}</p>}
            </div>
          )}
        </>
      )}

      {/* Hotel input */}
      <div className="card">
        <label className="label">🏨 Where are you staying?</label>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Enter hotel or area…"
            value={hotelInput}
            onChange={e => setHotelInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSelectedHotel(hotelInput); lookupHotel(hotelInput) }}}
          />
          <button
            className="btn-secondary px-3 text-sm whitespace-nowrap"
            onClick={() => { setSelectedHotel(hotelInput); lookupHotel(hotelInput) }}
            disabled={!hotelInput.trim() || noteLoading}
          >
            {noteLoading ? '…' : 'Look up'}
          </button>
        </div>
        {selectedHotel && !noteLoading && !note && (
          <p className="text-xs text-slate-3 mt-1.5">✓ {selectedHotel}</p>
        )}
        {noteLoading && <p className="text-sm text-slate-3 mt-2 italic">Looking up your accommodation…</p>}
        {note && !noteLoading && (
          <div className="note mt-3">{note}</div>
        )}
      </div>
    </div>
  )
}

// ── Itinerary section ────────────────────────────────────────────────────────

function ItinerarySection({ prefs, dest, flightDetails, carHire, selectedHotel, itinerary, setItinerary, user, onSaveTrip }) {
  const [loading,    setLoading]    = useState(false)
  const [feedback,   setFeedback]   = useState('')
  const [tweaking,   setTweaking]   = useState(false)
  const [activities, setActivities] = useState(null)
  const [mapPins,    setMapPins]    = useState(null)
  const [showMap,    setShowMap]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [showModal,  setShowModal]  = useState(false)

  const buildItinerary = async () => {
    if (!dest) return
    setLoading(true)
    setItinerary('')
    try {
      const ap = flightDetails.selectedAirport
      await api.itinerary({
        dest: `${dest.CITY}, ${dest.COUNTRY}`,
        dest_city: dest.CITY,
        origin_city: prefs.startingPoint,
        starting_point: prefs.startingPoint,
        budget: prefs.budget,
        group_type: prefs.groupType,
        trip_type: prefs.tripType,
        transport_mode: prefs.transportMode,
        priorities: prefs.priorities,
        specific_depart: flightDetails.outboundDate,
        specific_return: flightDetails.returnDate,
        num_adults: Number(prefs.numAdults),
        selected_hotel: selectedHotel,
        car_hire_confirmed: carHire.confirmed,
        arrival_time: flightDetails.arrivalTime || '11:00',
        departure_time: flightDetails.departureTime || '14:00',
        arrival_airport: ap ? `${ap.airport_name} (${ap.iata})` : dest.CITY,
        transfer_label: ap?.transfer_label || '30 min',
      }, (text) => setItinerary(text))
    } catch (e) {
      setItinerary('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setShowModal(true)
    }
  }

  const handleTweak = async () => {
    if (!feedback.trim() || !itinerary) return
    setTweaking(true)
    try {
      await api.tweak({
        dest: `${dest.CITY}, ${dest.COUNTRY}`,
        dest_city: dest.CITY,
        itinerary,
        feedback,
        origin_city: prefs.startingPoint,
      }, (text) => setItinerary(text))
      setFeedback('')
    } catch {}
    finally { setTweaking(false) }
  }

  const fetchActivities = async () => {
    if (!itinerary) return
    try {
      const d = await api.activities({ dest_city: dest.CITY, itinerary })
      setActivities(d.activities || [])
    } catch {}
  }

  const fetchMapPins = async () => {
    if (!itinerary) return
    try {
      const d = await api.mapPins({ itinerary, dest_city: dest.CITY })
      setMapPins(d.locations || [])
      setShowMap(true)
    } catch {}
  }

  const handleSave = async () => {
    if (!user || !itinerary) return
    setSaving(true)
    try {
      await saveTrip({
        destination:   dest.CITY,
        country:       dest.COUNTRY,
        emoji:         dest.EMOJI,
        itinerary,
        flightDetails,
        carHire,
        hotel:         selectedHotel,
        prefs,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      if (onSaveTrip) onSaveTrip()
    } catch (e) {
      alert('Could not save trip: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!dest) return null

  return (
    <div className="space-y-4">
      {/* Build button */}
      <button
        className="btn-primary w-full py-3 text-base"
        onClick={buildItinerary}
        disabled={loading}
      >
        🗓️ {itinerary ? 'Rebuild' : 'Build'} My Full Plan
      </button>

      {/* Open modal button if itinerary already exists */}
      {itinerary && !loading && (
        <button
          className="btn-secondary w-full text-sm"
          onClick={() => setShowModal(true)}
        >
          📖 View Itinerary
        </button>
      )}

      {/* Itinerary modal */}
      {showModal && (
        <ItineraryModal
          itinerary={itinerary}
          dest={dest}
          destData={dest}
          prefs={prefs}
          flightDetails={flightDetails}
          selectedHotel={selectedHotel}
          feedback={feedback}
          setFeedback={setFeedback}
          onTweak={handleTweak}
          tweaking={tweaking}
          onSave={handleSave}
          saving={saving}
          saved={saved}
          user={user}
          activities={activities}
          fetchActivities={fetchActivities}
          skyscannerUrl={flightDetails.confirmed && flightDetails.selectedAirport
            ? (() => {
                const ap = flightDetails.selectedAirport
                const depart = flightDetails.outboundDate
                const ret    = flightDetails.returnDate
                const yymmdd = (iso) => iso ? iso.replace(/-/g,'').slice(2) : ''
                const originSky = prefs.startingPoint?.match(/\(([A-Z]{3})\)/)?.[1]?.toLowerCase() || 'lon'
                if (!depart || !ret) return '#'
                return `https://www.skyscanner.net/transport/flights/${originSky}/${(ap.sky||ap.iata||'').toLowerCase()}/${yymmdd(depart)}/${yymmdd(ret)}/?adults=${prefs.numAdults}`
              })()
            : null}
          bookingUrl={(() => {
            if (!dest) return null
            const params = new URLSearchParams({ ss: dest.CITY, lang: 'en-gb', group_adults: prefs.numAdults || 2, no_rooms: 1 })
            if (flightDetails?.outboundDate) params.set('checkin', flightDetails.outboundDate)
            if (flightDetails?.returnDate)   params.set('checkout', flightDetails.returnDate)
            return `https://www.booking.com/searchresults.html?${params.toString()}`
          })()}
          carHireUrl={(() => {
            const dep = flightDetails?.outboundDate
            const ret = flightDetails?.returnDate
            const params = new URLSearchParams({ pickup: dest?.CITY || '' })
            if (dep) params.set('puDate', dep)
            if (ret) params.set('doDate', ret)
            return `https://www.rentalcars.com/en/?${params.toString()}`
          })()}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Keep old action buttons outside modal for map */}
      {itinerary && !loading && (
        <>
          {/* dummy section - map stays outside modal */}

          {/* Activities */}
          {activities !== null && (
            <div className="card">
              <h4 className="text-sm font-semibold text-slate mb-3">🎟️ Worth booking in advance</h4>
              {activities.length === 0
                ? <p className="text-sm text-slate-3">No specific advance bookings needed for this itinerary.</p>
                : activities.map((a,i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-white/8 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate">{a.name}</p>
                      <p className="text-xs text-slate-3">{a.why_book_ahead}</p>
                    </div>
                    <a href={a.gyg_url} target="_blank" rel="noopener noreferrer"
                       className="btn-secondary text-xs px-3 py-1 whitespace-nowrap shrink-0">
                      Book →
                    </a>
                  </div>
                ))
              }
            </div>
          )}

          {/* Map pins list (simple, no iframe) */}
          {showMap && mapPins !== null && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate">🗺️ Places in your itinerary</h4>
                <button className="text-xs text-slate-3 hover:text-gold" onClick={() => setShowMap(false)}>✕</button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {mapPins.map((p,i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-lg shrink-0">{
                      {Restaurant:'🍽️',Cafe:'☕',Bar:'🍸',Museum:'🏛️',
                       Attraction:'⭐',Market:'🛒',Park:'🌿',Viewpoint:'👁️',
                       Beach:'🏖️',Hotel:'🏨'}[p.type] || '📍'
                    }</span>
                    <div>
                      <p className="text-sm font-medium text-slate">{p.name}</p>
                      {p.description && <p className="text-xs text-slate-3">{p.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(dest.CITY + ' ' + mapPins.slice(0,3).map(p=>p.name).join(' '))}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-secondary block text-center text-sm mt-3"
              >
                Open in Google Maps →
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main BookTab ─────────────────────────────────────────────────────────────

export default function BookTab({
  prefs, setPrefs,
  chosenDest, setChosenDest,
  itinerary, setItinerary,
  flightDetails, setFlightDetails,
  carHire, setCarHire,
  selectedHotel, setSelectedHotel,
  user, onSaveTrip,
}) {
  const [destInput, setDestInput] = useState(
    chosenDest ? `${chosenDest.CITY}, ${chosenDest.COUNTRY}` : ''
  )

  // Allow manual destination entry
  const handleManualDest = () => {
    const parts = destInput.split(',')
    setChosenDest({ CITY: parts[0]?.trim(), COUNTRY: parts[1]?.trim() || '', EMOJI: '🌍' })
  }

  const dest = chosenDest

  return (
    <div className="space-y-8">
      {/* Destination */}
      <Section title="🌍 Destination">
        {dest ? (
          <div className="card-gold flex items-center justify-between">
            <div>
              <p className="text-slate-3 text-xs uppercase tracking-wider">Your destination</p>
              <p className="font-serif text-xl text-gold mt-0.5">
                {dest.EMOJI} {dest.CITY}{dest.COUNTRY ? `, ${dest.COUNTRY}` : ''}
              </p>
            </div>
            <button className="btn-secondary text-sm" onClick={() => { setChosenDest(null); setDestInput('') }}>
              Change
            </button>
          </div>
        ) : (
          <div className="card space-y-3">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="e.g. Lisbon, Portugal"
                value={destInput}
                onChange={e => setDestInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualDest()}
              />
              <button className="btn-primary px-5" onClick={handleManualDest}>
                Set →
              </button>
            </div>
            <p className="text-xs text-slate-3">Or go to ✨ Inspire to get personalised suggestions.</p>
          </div>
        )}
      </Section>

      <div className="divider" />

      {/* Flights */}
      <Section title="✈️ Find Flights">
        <FlightSection
          prefs={prefs}
          dest={dest}
          flightDetails={flightDetails}
          setFlightDetails={setFlightDetails}
        />
      </Section>

      <div className="divider" />

      {/* Car hire */}
      {prefs.transportMode !== 'public transport only' && (
        <>
          <Section title="🚗 Car Hire">
            <CarHireSection
              prefs={prefs}
              dest={dest}
              flightDetails={flightDetails}
              carHire={carHire}
              setCarHire={setCarHire}
            />
          </Section>
          <div className="divider" />
        </>
      )}

      {/* Accommodation */}
      <Section title="🏨 Where to Stay">
        <AccomSection
          prefs={prefs}
          dest={dest}
          carHire={carHire}
          selectedHotel={selectedHotel}
          setSelectedHotel={setSelectedHotel}
          flightDetails={flightDetails}
        />
      </Section>

      <div className="divider" />

      {/* Itinerary */}
      <Section title="🗓️ Your Itinerary">
        <ItinerarySection
          prefs={prefs}
          dest={dest}
          flightDetails={flightDetails}
          carHire={carHire}
          selectedHotel={selectedHotel}
          itinerary={itinerary}
          setItinerary={setItinerary}
          user={user}
          onSaveTrip={onSaveTrip}
        />
      </Section>
    </div>
  )
}
