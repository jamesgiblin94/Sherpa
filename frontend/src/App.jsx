import { useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import InspireTab from './components/InspireTab'
import BookTab from './components/BookTab'
import SupportTab from './components/SupportTab'

export default function App() {
  const [tab, setTab] = useState('inspire')

  // Global trip state — persisted to localStorage
  const [prefs, setPrefs] = useLocalStorage('sherpa_prefs', {
    startingPoint:  'london',
    startingLabel:  'London — all airports (LHR/LGW/STN/LTN/LCY)',
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

  // Shared results state
  const [inspireResults, setInspireResults] = useState([])
  const [chosenDest, setChosenDest] = useState(null)   // {CITY, COUNTRY, ...}
  const [itinerary, setItinerary]   = useState('')
  const [flightDetails, setFlightDetails] = useState({
    confirmed: false,
    outboundDate: null,
    returnDate: null,
    arrivalTime: '11:00',
    departureTime: '14:00',
    selectedAirport: null,
  })
  const [carHire, setCarHire] = useState({ confirmed: null, data: null })
  const [selectedHotel, setSelectedHotel] = useState('')

  const tabs = [
    { id: 'inspire', label: '✨  Inspire' },
    { id: 'book',    label: '🗓️  Book' },
    { id: 'support', label: '🧭  Support' },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gold/20 bg-navy/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-gold tracking-wide">Sherpa</h1>
            <p className="text-xs text-slate-3 tracking-widest uppercase">AI Travel Planner</p>
          </div>
          {/* Tab nav */}
          <nav className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-gold text-navy'
                    : 'text-slate hover:text-gold-light'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {tab === 'inspire' && (
          <InspireTab
            prefs={prefs}
            setPrefs={setPrefs}
            inspireResults={inspireResults}
            setInspireResults={setInspireResults}
            chosenDest={chosenDest}
            setChosenDest={setChosenDest}
            onBook={() => setTab('book')}
          />
        )}
        {tab === 'book' && (
          <BookTab
            prefs={prefs}
            setPrefs={setPrefs}
            chosenDest={chosenDest}
            setChosenDest={setChosenDest}
            itinerary={itinerary}
            setItinerary={setItinerary}
            flightDetails={flightDetails}
            setFlightDetails={setFlightDetails}
            carHire={carHire}
            setCarHire={setCarHire}
            selectedHotel={selectedHotel}
            setSelectedHotel={setSelectedHotel}
          />
        )}
        {tab === 'support' && (
          <SupportTab
            prefs={prefs}
            chosenDest={chosenDest}
            itinerary={itinerary}
            flightDetails={flightDetails}
            carHire={carHire}
            selectedHotel={selectedHotel}
          />
        )}
      </main>
    </div>
  )
}
