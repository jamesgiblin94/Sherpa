import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import SherpaSpinner from './SherpaSpinner'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const BUDGETS = ['£ — Budget', '££ — Mid-range', '£££ — Luxury']
const GROUPS  = ['Solo', 'Couple', 'Family', 'Group of friends', 'Group with kids']
const TRIPS   = ['City Break', 'Beach', 'Culture & History', 'Adventure', 'Food & Drink',
                 'Nature & Hiking', 'Relaxation', 'Ski', 'Festivals & Events']
const TRANSPORT = [
  { value: 'willing to rent',   label: '🚗 Open to car hire' },
  { value: 'public transport',  label: '🚇 Public transport only' },
]

// Airport coordinates for nearest-airport detection
const AIRPORT_COORDS = [
  { value: 'london',        lat: 51.509,  lon: -0.118  },
  { value: 'manchester',    lat: 53.365,  lon: -2.273  },
  { value: 'birmingham',    lat: 52.454,  lon: -1.748  },
  { value: 'edinburgh',     lat: 55.950,  lon: -3.372  },
  { value: 'glasgow',       lat: 55.872,  lon: -4.433  },
  { value: 'bristol',       lat: 51.383,  lon: -2.719  },
  { value: 'leeds',         lat: 53.865,  lon: -1.660  },
  { value: 'newcastle',     lat: 55.038,  lon: -1.692  },
  { value: 'liverpool',     lat: 53.334,  lon: -2.850  },
  { value: 'belfast',       lat: 54.658,  lon: -6.216  },
  { value: 'cardiff',       lat: 51.397,  lon: -3.343  },
  { value: 'southampton',   lat: 50.950,  lon: -1.357  },
  { value: 'aberdeen',      lat: 57.202,  lon: -2.198  },
  { value: 'inverness',     lat: 57.543,  lon: -4.048  },
  { value: 'east midlands', lat: 52.831,  lon: -1.328  },
  { value: 'exeter',        lat: 50.734,  lon: -3.414  },
  { value: 'norwich',       lat: 52.676,  lon:  1.282  },
  { value: 'bournemouth',   lat: 50.780,  lon: -1.842  },
  { value: 'doncaster',     lat: 53.475,  lon: -1.011  },
  { value: 'newquay',       lat: 50.440,  lon: -4.995  },
  { value: 'teesside',      lat: 54.509,  lon: -1.430  },
  { value: 'jersey',        lat: 49.208,  lon: -2.196  },
  { value: 'guernsey',      lat: 49.435,  lon: -2.602  },
  { value: 'isle of man',   lat: 54.083,  lon: -4.624  },
]

function getNearestAirport(lat, lon) {
  let nearest = AIRPORT_COORDS[0]
  let minDist = Infinity
  for (const ap of AIRPORT_COORDS) {
    const d = Math.hypot(ap.lat - lat, ap.lon - lon)
    if (d < minDist) { minDist = d; nearest = ap }
  }
  return nearest.value
}

// UK airports list for the dropdown
const UK_AIRPORTS = [
  { label: 'London — all airports (LHR/LGW/STN/LTN/LCY)', value: 'london' },
  { label: 'London City (LCY)',                             value: 'london city' },
  { label: 'London Gatwick (LGW)',                          value: 'gatwick' },
  { label: 'London Heathrow (LHR)',                         value: 'heathrow' },
  { label: 'London Luton (LTN)',                            value: 'luton' },
  { label: 'London Southend (SEN)',                         value: 'southend' },
  { label: 'London Stansted (STN)',                         value: 'stansted' },
  { label: 'Aberdeen (ABZ)',                                value: 'aberdeen' },
  { label: 'Belfast — all airports (BFS/BHD)',              value: 'belfast' },
  { label: 'Birmingham (BHX)',                              value: 'birmingham' },
  { label: 'Bournemouth (BOH)',                             value: 'bournemouth' },
  { label: 'Bristol (BRS)',                                 value: 'bristol' },
  { label: 'Cardiff (CWL)',                                 value: 'cardiff' },
  { label: 'Doncaster Sheffield (DSA)',                     value: 'doncaster' },
  { label: 'East Midlands (EMA)',                           value: 'east midlands' },
  { label: 'Edinburgh (EDI)',                               value: 'edinburgh' },
  { label: 'Exeter (EXT)',                                  value: 'exeter' },
  { label: 'Glasgow — all airports (GLA/PIK)',              value: 'glasgow' },
  { label: 'Glasgow Prestwick (PIK)',                       value: 'prestwick' },
  { label: 'Guernsey (GCI)',                                value: 'guernsey' },
  { label: 'Inverness (INV)',                               value: 'inverness' },
  { label: 'Isle of Man (IOM)',                             value: 'isle of man' },
  { label: 'Jersey (JER)',                                  value: 'jersey' },
  { label: 'Leeds Bradford (LBA)',                          value: 'leeds' },
  { label: 'Liverpool (LPL)',                               value: 'liverpool' },
  { label: 'Manchester (MAN)',                              value: 'manchester' },
  { label: 'Newcastle (NCL)',                               value: 'newcastle' },
  { label: 'Newquay (NQY)',                                 value: 'newquay' },
  { label: 'Norwich (NWI)',                                 value: 'norwich' },
  { label: 'Southampton (SOU)',                             value: 'southampton' },
  { label: 'Teesside / Durham (MME)',                       value: 'teesside' },
]

function AirportSelect({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = UK_AIRPORTS.find(a => a.value === value)
  const filtered = UK_AIRPORTS.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="relative">
      <div
        className="input flex items-center justify-between cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <span className={selected ? 'text-slate' : 'text-slate-3'}>
          {selected ? selected.label : 'Select departure airport…'}
        </span>
        <span className="text-slate-3 text-xs">▼</span>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-navy-2 border border-white/10 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/8">
            <input
              className="input text-sm"
              placeholder="Type to search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(a => (
              <div
                key={a.value}
                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-sage/10 hover:text-sage transition-colors
                  ${a.value === value ? 'text-sage bg-sage/5' : 'text-slate'}`}
                onClick={() => { onChange(a.value); setSearch(''); setOpen(false) }}
              >
                {a.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-3">No airports found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DestCard({ dest, onChoose }) {
  const [expanded, setExpanded] = useState(false)
  const [photo,    setPhoto]    = useState(null)

  useEffect(() => {
    api.photo(`${dest.CITY} ${dest.COUNTRY} travel`)
      .then(p => { if (p.url) setPhoto(p) })
      .catch(() => {})
  }, [dest.CITY])

  return (
    <div className="card-gold hover:border-sage/60 transition-colors overflow-hidden">
      {/* Hero photo */}
      {photo && (
        <div className="relative -mx-5 -mt-5 mb-4 h-44 overflow-hidden">
          <img
            src={photo.url}
            alt={dest.CITY}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.85)' }}
          />
          <div className="absolute inset-0" style={{background:'linear-gradient(to bottom, transparent 50%, #1a2020 100%)'}} />
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span className="text-2xl">{dest.EMOJI}</span>
            <div>
              <h3 className="font-serif text-xl" style={{color:'#f0ede8'}}>{dest.CITY}</h3>
              <p className="text-xs uppercase tracking-wider" style={{color:'rgba(240,237,232,0.6)'}}>{dest.COUNTRY}</p>
            </div>
          </div>
          {dest.BEST_FOR && (
            <div className="absolute top-3 right-3">
              <span className="badge">{dest.BEST_FOR}</span>
            </div>
          )}
        </div>
      )}

      {/* No photo fallback header */}
      {!photo && (
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{dest.EMOJI}</span>
            <div>
              <h3 className="font-serif text-xl text-sage-light">{dest.CITY}</h3>
              <p className="text-xs text-slate-3 uppercase tracking-wider">{dest.COUNTRY}</p>
            </div>
          </div>
          {dest.BEST_FOR && <span className="badge shrink-0">{dest.BEST_FOR}</span>}
        </div>
      )}

      <p className="text-sm text-slate italic mb-4">"{dest.TAGLINE}"</p>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        {dest.FLIGHT && (
          <div>
            <p className="section-label">✈️ Flight</p>
            <p className="text-slate">{dest.FLIGHT}</p>
          </div>
        )}
        {dest.WEATHER && (
          <div>
            <p className="section-label">🌤 Weather</p>
            <p className="text-slate">{dest.WEATHER}</p>
          </div>
        )}
      </div>

      {dest.highlights?.length > 0 && (
        <ul className="mt-3 space-y-1">
          {dest.highlights.map((h, i) => (
            <li key={i} className="text-sm text-slate flex gap-2">
              <span className="text-sage shrink-0">•</span>{h}
            </li>
          ))}
        </ul>
      )}

      {dest.DISH && (
        <p className="mt-3 text-sm text-slate-3 italic">🍴 Must try: <span className="text-slate">{dest.DISH}</span></p>
      )}

      {/* Cost guide toggle */}
      {dest.cost_guide?.length > 0 && (
        <div className="mt-3">
          <button
            className="text-xs text-sage hover:text-sage-light transition-colors"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? '▲ Hide' : '▼ Show'} cost guide
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 border-t border-white/8 pt-2">
              {dest.cost_guide.map((line, i) => (
                <p key={i} className="text-xs text-slate" dangerouslySetInnerHTML={{
                  __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sage-light">$1</strong>')
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/8">
        <button className="btn-primary w-full" onClick={() => onChoose(dest)}>
          Plan this trip →
        </button>
      </div>
    </div>
  )
}

export default function InspireTab({ prefs, setPrefs, inspireResults, setInspireResults, chosenDest, setChosenDest, onBook }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [prefsOpen, setPrefsOpen] = useState(!inspireResults.length)
  const [dateMode, setDateMode]   = useState('flexible')
  const [destPref, setDestPref]   = useState('')
  const [geoStatus, setGeoStatus] = useState('') // 'detecting' | 'found' | 'denied' | ''

  // Auto-detect nearest airport on first load (only if no airport already saved)
  useEffect(() => {
    if (prefs.startingPoint) return // already set, don't override
    if (!navigator.geolocation) return
    setGeoStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = getNearestAirport(pos.coords.latitude, pos.coords.longitude)
        setPrefs(p => ({ ...p, startingPoint: nearest }))
        setGeoStatus('found')
        setTimeout(() => setGeoStatus(''), 3000)
      },
      () => setGeoStatus('denied')
    )
  }, [])

  const update = (key, val) => setPrefs(p => ({ ...p, [key]: val }))

  const toggleTrip = (t) =>
    update('tripType', prefs.tripType.includes(t)
      ? prefs.tripType.filter(x => x !== t)
      : [...prefs.tripType, t])

  const handleInspire = async () => {
    if (!prefs.startingPoint) return
    setLoading(true)
    setError('')
    try {
      const body = {
        starting_point:  prefs.startingPoint,
        budget:          prefs.budget,
        group_type:      prefs.groupType,
        trip_type:       prefs.tripType,
        transport_mode:  prefs.transportMode,
        priorities:      prefs.priorities,
        num_adults:      Number(prefs.numAdults),
        dest_preference: destPref,
        ...(dateMode === 'specific'
          ? { specific_depart: prefs.specificDepart, specific_return: prefs.specificReturn }
          : { travel_month: prefs.travelMonth }),
      }
      const data = await api.inspire(body)
      setInspireResults(data.destinations || [])
      setPrefsOpen(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChoose = (dest) => {
    setChosenDest(dest)
    onBook()
  }

  return (
    <div className="space-y-6">
      {/* Preferences panel */}
      <div className="card">
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setPrefsOpen(o => !o)}
        >
          <h2 className="font-serif text-lg text-sage-light">🎒 Your Travel Preferences</h2>
          <span className="text-slate-3 text-sm">{prefsOpen ? '▲ Close' : '▼ Edit'}</span>
        </button>

        {prefsOpen && (
          <div className="mt-5 space-y-5">
            {/* Departure airport */}
            <div>
              <label className="label">📍 Departing from</label>
              <AirportSelect value={prefs.startingPoint} onChange={v => { update('startingPoint', v); setGeoStatus('') }} />
              {geoStatus === 'detecting' && (
                <p className="text-xs text-slate-3 mt-1 italic">📍 Detecting your nearest airport…</p>
              )}
              {geoStatus === 'found' && (
                <p className="text-xs text-green-400 mt-1">✓ Nearest airport detected</p>
              )}
              {geoStatus === 'denied' && (
                <p className="text-xs text-slate-3 mt-1">Location access denied — please select manually</p>
              )}
            </div>

            {/* Budget + Group */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">💰 Budget</label>
                <select className="select" value={prefs.budget} onChange={e => update('budget', e.target.value)}>
                  {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">👥 Travelling as</label>
                <select className="select" value={prefs.groupType} onChange={e => update('groupType', e.target.value)}>
                  {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Adults */}
            <div>
              <label className="label">🧑 Number of adults</label>
              <input type="number" min={1} max={20} className="input w-24"
                value={prefs.numAdults} onChange={e => update('numAdults', e.target.value)} />
            </div>

            {/* Trip types */}
            <div>
              <label className="label">🗺 Trip type (pick any)</label>
              <div className="flex flex-wrap gap-2">
                {TRIPS.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTrip(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      prefs.tripType.includes(t)
                        ? 'bg-sage/20 border-sage/60 text-sage'
                        : 'border-white/10 text-slate hover:border-sage/30 hover:text-sage-light'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Transport */}
            <div>
              <label className="label">🚗 Transport preference</label>
              <div className="flex gap-3">
                {TRANSPORT.map(t => (
                  <button
                    key={t.value}
                    onClick={() => update('transportMode', t.value)}
                    className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${
                      prefs.transportMode === t.value
                        ? 'bg-sage/20 border-sage/60 text-sage'
                        : 'border-white/10 text-slate hover:border-sage/30'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priorities */}
            <div>
              <label className="label">⭐ Priorities & interests</label>
              <input
                className="input"
                placeholder="e.g. good food, art, family-friendly, swimming…"
                value={prefs.priorities}
                onChange={e => update('priorities', e.target.value)}
              />
            </div>

            {/* Dates */}
            <div>
              <label className="label">📅 When</label>
              <div className="flex gap-2 mb-3">
                {['flexible','specific'].map(m => (
                  <button
                    key={m}
                    onClick={() => setDateMode(m)}
                    className={`text-sm px-4 py-1.5 rounded-lg border transition-colors capitalize ${
                      dateMode === m
                        ? 'bg-sage/20 border-sage/60 text-sage'
                        : 'border-white/10 text-slate hover:border-sage/30'
                    }`}
                  >
                    {m === 'flexible' ? '🗓 Flexible (pick a month)' : '📆 Specific dates'}
                  </button>
                ))}
              </div>

              {dateMode === 'flexible' ? (
                <select className="select" value={prefs.travelMonth}
                  onChange={e => update('travelMonth', e.target.value)}>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <div className="flex gap-3 items-center">
                  <div>
                    <label className="label">Depart</label>
                    <DatePicker
                      selected={prefs.specificDepart ? new Date(prefs.specificDepart) : null}
                      onChange={d => update('specificDepart', d?.toISOString().slice(0,10))}
                      dateFormat="dd/MM/yyyy"
                      calendarStartDay={1}
                      minDate={new Date()}
                      className="input w-36"
                      placeholderText="DD/MM/YYYY"
                    />
                  </div>
                  <span className="text-slate-3 mt-5">→</span>
                  <div>
                    <label className="label">Return</label>
                    <DatePicker
                      selected={prefs.specificReturn ? new Date(prefs.specificReturn) : null}
                      onChange={d => update('specificReturn', d?.toISOString().slice(0,10))}
                      dateFormat="dd/MM/yyyy"
                      calendarStartDay={1}
                      minDate={prefs.specificDepart ? new Date(prefs.specificDepart) : new Date()}
                      className="input w-36"
                      placeholderText="DD/MM/YYYY"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Destination preference */}
            <div>
              <label className="label">🔍 Destination preference <span className="normal-case font-normal text-slate-3">(optional)</span></label>
              <input
                className="input"
                placeholder="e.g. Portugal, Greek islands, somewhere warm…"
                value={destPref}
                onChange={e => setDestPref(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              className="btn-primary w-full text-base py-3"
              onClick={handleInspire}
              disabled={!prefs.startingPoint || loading}
            >
              ✨ Inspire Me!
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <SherpaSpinner messages={[
            'Sherpa is on the move…',
            'Scouting the perfect route…',
            'Consulting the map…',
            'Checking conditions ahead…',
            'Weighing up your options…',
            'Almost at base camp…',
          ]} />
        </div>
      )}

      {/* Results */}
      {!loading && inspireResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-sage-light">
              {inspireResults.length === 1 ? 'Your destination' : `${inspireResults.length} destinations for you`}
            </h2>
            <button className="btn-secondary text-sm" onClick={() => setPrefsOpen(true)}>
              ↩ Change preferences
            </button>
          </div>
          {inspireResults.map((dest, i) => (
            <DestCard key={i} dest={dest} onChoose={handleChoose} />
          ))}
        </div>
      )}

      {/* Chosen confirmation */}
      {chosenDest && !loading && (
        <div className="card-gold text-center py-4">
          <p className="text-slate-3 text-sm">Currently planning</p>
          <p className="font-serif text-lg text-sage mt-1">
            {chosenDest.EMOJI} {chosenDest.CITY}, {chosenDest.COUNTRY}
          </p>
          <button className="btn-primary mt-3" onClick={onBook}>
            Continue planning →
          </button>
        </div>
      )}
    </div>
  )
}
