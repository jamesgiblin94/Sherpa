import { useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { supabase } from './utils/supabase'
import InspireTab from './components/InspireTab'
import BookTab from './components/BookTab'
import SupportTab from './components/SupportTab'
import AuthModal from './components/AuthModal'
import FeedbackModal from './components/FeedbackModal'
import MyTrips from './components/MyTrips'
import ProfileSetup from './components/ProfileSetup'
import AccountMenu from './components/AccountMenu'
import { Routes, Route } from 'react-router-dom'
import BlogIndex from './blog/BlogIndex'
import BlogPost from './blog/BlogPost'
import ItineraryModal from './components/ItineraryModal'
import { api } from './utils/api'
import { getProfile } from './utils/supabase'

export default function App() {
  const [tab, setTab] = useState('inspire')
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showItineraryModal,  setShowItineraryModal]  = useState(false)
  const [modalActivities,     setModalActivities]     = useState(null)
  const [modalActivitiesLoad, setModalActivitiesLoad] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

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
    numChildren:    0,
    childrenAges:   [],
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

  const loadProfile = async (u) => {
  const profile = await getProfile(u.id)
  if (!profile) {
    // First ever login after email confirmation — send welcome email silently
    api.welcomeEmail({ email: u.email, first_name: '' }).catch(() => {})
    setShowProfile(true)
  } else {
    setUserProfile(profile)
  }
}

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadProfile(user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null
      setUser(u)
      if (u) loadProfile(u)
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

    let outbound = p.specificDepart || null
    let ret      = p.specificReturn  || null
    if (!outbound && p.travelMonth) {
      const months = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']
      const mIdx = months.indexOf(p.travelMonth)
      if (mIdx >= 0) {
        const year = new Date().getFullYear()
        const useYear = mIdx < new Date().getMonth() ? year + 1 : year
        outbound = `${useYear}-${String(mIdx+1).padStart(2,'0')}-10`
        ret      = `${useYear}-${String(mIdx+1).padStart(2,'0')}-14`
      }
    }

    setFlightDetails({
      confirmed:       false,
      outboundDate:    outbound,
      returnDate:      ret,
      arrivalTime:     '11:00',
      departureTime:   '14:00',
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
    setShowItineraryModal(true)
    setModalActivities(null)
  }

  const switchTab = (id) => {
    setTab(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tabs = [
    { id: 'inspire', label: '✨ Inspire' },
    { id: 'book',    label: '🗓️ Book'   },
    { id: 'trips',   label: '🧭 Trips'  },
  ]

  return (
    <Routes>
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/*" element={(
    <div className="min-h-screen">
      <header className="sticky top-0 z-50" style={{background:'rgba(17,22,20,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(127,182,133,0.1)'}}>
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <h1 className="font-serif text-xl tracking-wide shrink-0" style={{color:'#a8c9ad'}}>
            Sherpa Travel
          </h1>
          <div className="flex items-center gap-1">
            <nav className="flex gap-1">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: tab === t.id ? 'rgba(127,182,133,0.15)' : 'transparent',
                    color: tab === t.id ? '#a8c9ad' : '#7a7870',
                    border: tab === t.id ? '1px solid rgba(127,182,133,0.3)' : '1px solid transparent',
                  }}
                >
                  {t.label}
                </button>
              ))}
              <a href="/blog"
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{color:'#7a7870', border:'1px solid transparent'}}
                onMouseEnter={e => e.target.style.color='#a8c9ad'}
                onMouseLeave={e => e.target.style.color='#7a7870'}>
                ✍️ Blog
              </a>
              <button
                onClick={() => setShowFeedback(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{color:'#7a7870', border:'1px solid transparent'}}
                onMouseEnter={e => e.target.style.color='#a8c9ad'}
                onMouseLeave={e => e.target.style.color='#7a7870'}>
                💬 Feedback
              </button>
            </nav>
            {user ? (
              <AccountMenu
                user={user}
                userProfile={userProfile}
                onEditProfile={() => setShowEditProfile(true)}
                onSignOut={handleSignOut}
              />
            ) : (
              <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setShowAuth(true)}>Sign in</button>
            )}
          </div>
        </div>
      </header>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      )}

      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} user={user} />
      )}

      {showProfile && user && (
        <ProfileSetup
          user={user}
          onComplete={(profile) => { setUserProfile(profile); setShowProfile(false) }}
        />
      )}

      {showEditProfile && user && (
        <ProfileSetup
          user={user}
          existingProfile={userProfile}
          onComplete={(profile) => { setUserProfile(profile); setShowEditProfile(false) }}
        />
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {tab === 'inspire' && (
          <InspireTab
            prefs={prefs} setPrefs={setPrefs}
            inspireResults={inspireResults} setInspireResults={setInspireResults}
            chosenDest={chosenDest} setChosenDest={handleChooseDest}
            onBook={() => switchTab('book')}
            user={user}
            onRequireAuth={() => setShowAuth(true)}
            onRequestFeedback={() => setShowFeedback(true)}
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
            user={user} userProfile={userProfile} onSaveTrip={() => switchTab('trips')}
            externalShowModal={showItineraryModal} setExternalShowModal={setShowItineraryModal}
            onRequireAuth={() => setShowAuth(true)}
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

      {showItineraryModal && itinerary && (
        <ItineraryModal
          itinerary={itinerary}
          dest={chosenDest}
          destData={null}
          prefs={prefs}
          flightDetails={flightDetails}
          selectedHotel={selectedHotel}
          onClose={() => setShowItineraryModal(false)}
          activities={modalActivities}
          activitiesLoading={modalActivitiesLoad}
          fetchActivities={async () => {
            if (!chosenDest?.CITY || !itinerary) return
            setModalActivitiesLoad(true)
            try {
              const d = await api.activities({ dest_city: chosenDest.CITY, itinerary })
              setModalActivities({ gyg: d.gyg || [], direct: d.direct || [] })
            } catch {}
            finally { setModalActivitiesLoad(false) }
          }}
          feedback=""
          setFeedback={() => {}}
          onTweak={() => {}}
          tweaking={false}
          onSave={() => {}}
          saving={false}
          saved={false}
          user={user}
        />
      )}
    </div>
    )} />
    </Routes>
  )
}
