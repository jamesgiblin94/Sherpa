import { useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { supabase } from './utils/supabase'
import InspireTab from './components/InspireTab'
import BookTab from './components/BookTab'
import SupportTab from './components/SupportTab'
import AuthModal from './components/AuthModal'
import MyTrips from './components/MyTrips'

export default function App() {
  const [tab, setTab] = useState('inspire')
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  const [prefs, setPrefs] = useLocalStorage('sherpa_prefs', {
    startingPoint:  '',
    budget:         '££ — Mid-range',
    groupType:      'Couple',
    tripType:       [],
    transportMode:  'willing to rent',
    priorities:     '',
    travelMonth:    'May',
    specificDepart: null,
    specificReturn: null,
    numAdults:      2,
  })

  const [inspireResults, setInspireResults] = useState([])
  const [chosenDest, setChosenDest]         = useState(null)
  const [itinerary, setItinerary]           = useState('')
  const [flightDetails, setFlightDetails]   = useState({
    confirmed: false, outboundDate: null, returnDate: null,
    arrivalTime: '11:00', departureTime: '14:00', selectedAirport: null,
  })
  const [carHire, setCarHire]             = useState({ confirmed: null, data: null })
  const [selectedHotel, setSelectedHotel] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setTab('inspire')
  }

  const resetTripState = (newPrefs) => {
    const p = newPrefs || prefs
    setItinerary('')
    setFlightDetails({
      confirmed:     false,
      outboundDate:  p.specificDepart || null,
      returnDate:    p.specificReturn  || null,
      arrivalTime:   '11:00',
      departureTime: '14:00',
      selectedAirport: null,
    })
    setCarHire({ confirmed: null, data: null })
    setSelectedHotel('')
  }

  const handleChooseDest = (dest) => {
    resetTripState()
    setChosenDest(dest)
    setTab('book')
  }

  const handleLoadTrip = (trip) => {
    setChosenDest({ CITY: trip.destination, COUNTRY: trip.country, EMOJI: trip.emoji || '🌍' })
    if (trip.itinerary)      setItinerary(trip.itinerary)
    if (trip.flight_details) setFlightDetails(trip.flight_details)
    if (trip.car_hire)       setCarHire(trip.car_hire)
    if (trip.hotel)          setSelectedHotel(trip.hotel)
    setTab('book')
  }

  const tabs = [
    { id: 'inspire', label: '✨  Inspire' },
    { id: 'book',    label: '🗓️  Book'   },
    { id: 'trips',   label: '🧭  Trips'  },
  ]

  return (
    <div className="min-h-screen">
      <header className="border-b border-gold/20 bg-navy/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-gold tracking-wide">Sherpa</h1>
            <p className="text-xs text-slate-3 tracking-widest uppercase">AI Travel Planner</p>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id ? 'bg-gold text-navy' : 'text-slate hover:text-gold-light'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-3 hidden sm:block">{user.email}</span>
                <button className="btn-secondary text-xs px-3 py-1.5" onClick={handleSignOut}>Sign out</button>
              </div>
            ) : (
              <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setShowAuth(true)}>Sign in</button>
            )}
          </div>
        </div>
      </header>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {tab === 'inspire' && (
          <InspireTab
            prefs={prefs} setPrefs={setPrefs}
            inspireResults={inspireResults} setInspireResults={setInspireResults}
            chosenDest={chosenDest} setChosenDest={handleChooseDest}
            onBook={() => setTab('book')}
          />
        )}
        {tab === 'book' && (
          <BookTab
            prefs={prefs} setPrefs={setPrefs}
            chosenDest={chosenDest} setChosenDest={setChosenDest}
            itinerary={itinerary} setItinerary={setItinerary}
            flightDetails={flightDetails} setFlightDetails={setFlightDetails}
            carHire={carHire} setCarHire={setCarHire}
            selectedHotel={selectedHotel} setSelectedHotel={setSelectedHotel}
            user={user} onSaveTrip={() => setTab('mytrips')}
          />
        )}
        {tab === 'trips' && (
          <div className="space-y-8">
            <SupportTab
              prefs={prefs} chosenDest={chosenDest} itinerary={itinerary}
              flightDetails={flightDetails} carHire={carHire} selectedHotel={selectedHotel}
            />
            {user ? (
              <div className="space-y-4">
                <h2 className="font-serif text-xl text-gold-light">📁 Saved Trips</h2>
                <MyTrips onLoadTrip={handleLoadTrip} />
              </div>
            ) : (
              <div className="card text-center py-6">
                <p className="text-slate-3 text-sm mb-3">Sign in to save and revisit your itineraries</p>
                <button className="btn-primary px-6" onClick={() => setShowAuth(true)}>Sign in</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
