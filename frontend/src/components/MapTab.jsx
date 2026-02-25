import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { track } from '../utils/analytics'
import SherpaSpinner from './SherpaSpinner'

// ── Category config ────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  Restaurant: { color: '#f97316', icon: '🍽️', label: 'Restaurants' },
  Cafe:       { color: '#d97706', icon: '☕',  label: 'Cafes' },
  Bar:        { color: '#a855f7', icon: '🍸',  label: 'Bars' },
  Museum:     { color: '#3b82f6', icon: '🏛️', label: 'Museums' },
  Attraction: { color: '#eab308', icon: '⭐',  label: 'Attractions' },
  Market:     { color: '#22c55e', icon: '🛒',  label: 'Markets' },
  Park:       { color: '#10b981', icon: '🌿',  label: 'Parks' },
  Viewpoint:  { color: '#06b6d4', icon: '👁️', label: 'Viewpoints' },
  Beach:      { color: '#14b8a6', icon: '🏖️', label: 'Beaches' },
  Hotel:      { color: '#ef4444', icon: '🏨',  label: 'Hotels' },
}
const DEFAULT_CAT = { color: '#7fb685', icon: '📍', label: 'Other' }
const getCat = (type) => CATEGORY_CONFIG[type] || DEFAULT_CAT

// ── Load Google Maps script once ───────────────────────────────────────
function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return }
    if (document.getElementById('gmaps-script')) {
      // Script already loading — wait for it
      const wait = setInterval(() => {
        if (window.google?.maps) { clearInterval(wait); resolve(window.google.maps) }
      }, 100)
      return
    }
    const script = document.createElement('script')
    script.id = 'gmaps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.onload = () => resolve(window.google.maps)
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

// ── Google Map component ───────────────────────────────────────────────
function GoogleMapView({ pins, apiKey, city }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)

  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    const validPins = pins.filter(p => p.lat && p.lng)
    if (validPins.length === 0) return

    loadGoogleMaps(apiKey).then((maps) => {
      // Create map if not already created
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new maps.Map(mapRef.current, {
          zoom: 13,
          center: { lat: validPins[0].lat, lng: validPins[0].lng },
          mapTypeId: 'roadmap',
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#1a2020' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2020' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#c8c4bc' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#283428' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111614' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a5a3a' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2020' }] },
            { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2820' }] },
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })
      }

      const map = mapInstanceRef.current
      infoWindowRef.current = new maps.InfoWindow()

      // Clear old markers
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []

      const bounds = new maps.LatLngBounds()

      validPins.forEach((pin) => {
        const cat = getCat(pin.type)

        const marker = new maps.Marker({
          position: { lat: pin.lat, lng: pin.lng },
          map,
          title: pin.name,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: cat.color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        })

        marker.addListener('click', () => {
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.name + ' ' + city)}`
          infoWindowRef.current.setContent(`
            <div style="font-family:Inter,sans-serif;padding:4px;min-width:160px;max-width:220px;">
              <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#111614;">${cat.icon} ${pin.name}</p>
              ${pin.description ? `<p style="margin:0 0 6px;font-size:11px;color:#555;">${pin.description}</p>` : ''}
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
                 style="font-size:11px;color:#4285f4;text-decoration:none;">
                Open in Google Maps →
              </a>
            </div>
          `)
          infoWindowRef.current.open(map, marker)
        })

        markersRef.current.push(marker)
        bounds.extend({ lat: pin.lat, lng: pin.lng })
      })

      if (validPins.length > 1) {
        map.fitBounds(bounds)
      } else {
        map.setCenter({ lat: validPins[0].lat, lng: validPins[0].lng })
        map.setZoom(15)
      }
    }).catch(console.error)

    return () => {
      infoWindowRef.current?.close()
    }
  }, [pins, apiKey])

  return (
    <div
      ref={mapRef}
      style={{
        height: 360,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(127,182,133,0.2)',
      }}
    />
  )
}

// ── Pin list item ──────────────────────────────────────────────────────
function PinRow({ pin, city }) {
  const cat = getCat(pin.type)
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.name + ' ' + city)}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(127,182,133,0.08)'; e.currentTarget.style.borderColor = 'rgba(127,182,133,0.25)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: '50%',
        background: cat.color + '22',
        border: `1px solid ${cat.color}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, flexShrink: 0,
      }}>
        {cat.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#f0ede8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pin.name}
        </p>
        {pin.description && (
          <p style={{ margin: 0, fontSize: 11, color: cat.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pin.description}
          </p>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#7a7870', flexShrink: 0 }}>Open ↗</span>
    </a>
  )
}

// ── KML generation ────────────────────────────────────────────────────
const KML_COLORS = {
  Restaurant: 'ff1400f9', Cafe: 'ff06b6d4', Bar: 'fff7a8d9',
  Museum: 'ffec8305', Attraction: 'ff00b4ea', Market: 'ff4dc25e',
  Park: 'ff1db981', Viewpoint: 'ffd4b606', Beach: 'ff14b8a6',
  Hotel: 'ff4444ef',
}

function generateKML(pins, city, emoji) {
  const validPins = pins.filter(p => p.lat && p.lng)
  const placemarks = validPins.map(pin => {
    const color = KML_COLORS[pin.type] || 'ff7fb685'
    return `  <Placemark>
    <name>${pin.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</name>
    <description>${(pin.description || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</description>
    <Style><IconStyle><color>${color}</color><scale>1.1</scale>
      <Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon>
    </IconStyle></Style>
    <Point><coordinates>${pin.lng},${pin.lat},0</coordinates></Point>
  </Placemark>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${emoji} ${city} Itinerary</name>
  <description>Generated by Sherpa Travel</description>
${placemarks}
</Document>
</kml>`
}

function downloadKML(pins, city, emoji, destCity) {
  track('map_export', { format: 'kml', destination: destCity })
  const kml  = generateKML(pins, city, emoji)
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${city.toLowerCase().replace(/\s+/g, '-')}-itinerary.kml`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Main MapTab export ─────────────────────────────────────────────────
export default function MapTab({ dest, itinerary }) {
  const [pins, setPins] = useState(null)
  const [apiKey, setApiKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const fetchingRef = useRef(false)
  const city = dest?.CITY || ''

  // Fetch API key from config
  useEffect(() => {
    api.getConfig().then(cfg => {
      if (cfg.google_maps_key) setApiKey(cfg.google_maps_key)
    }).catch(() => {})
  }, [])

  // Fetch pins — ref guard prevents double-call in React StrictMode dev mode
  useEffect(() => {
    if (!itinerary || !dest?.CITY || pins || fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    api.mapPins({ itinerary, dest_city: dest.CITY })
      .then(d => { setPins(d.locations || []) })
      .catch(() => setPins([]))
      .finally(() => { setLoading(false); fetchingRef.current = false })
  }, [itinerary, dest?.CITY])

  if (loading) {
    return (
      <div className="py-8">
        <SherpaSpinner messages={['Mapping your itinerary…', 'Pinning locations…', 'Nearly there…']} />
      </div>
    )
  }

  if (!pins || pins.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: '#a0a098' }}>No locations found. Generate an itinerary first.</p>
      </div>
    )
  }

  const validPins = pins.filter(p => p.lat && p.lng)
  const categories = [...new Set(pins.map(p => p.type || 'Other'))].sort()
  const filtered = activeFilter === 'all' ? pins : pins.filter(p => (p.type || 'Other') === activeFilter)

  return (
    <div className="space-y-4">

      {/* Embedded Google Map */}
      {apiKey && validPins.length > 0 && (
        <GoogleMapView pins={filtered.length > 0 ? filtered : pins} apiKey={apiKey} city={city} />
      )}

      {/* No API key fallback */}
      {!apiKey && validPins.length > 0 && (
        <div className="rounded-xl text-center py-6" style={{ background: '#1a2020', border: '1px solid rgba(127,182,133,0.15)' }}>
          <p className="text-sm" style={{ color: '#7a7870' }}>Map preview unavailable</p>
        </div>
      )}

      {/* Individual pins link to Google Maps directly — see PinRow */}

      {/* Save all pins to Google Maps (KML) */}
      {validPins.length > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: '#1a2020', border: '1px solid rgba(52,168,83,0.25)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#34a853' }}>📱 Save all pins to Google Maps</p>
              <p className="text-xs leading-relaxed" style={{ color: '#7a7870' }}>
                Download the file, then tap <span style={{ color: '#a0a098' }}>"Open with Google Maps"</span> — all {validPins.length} pins appear on your map instantly.
              </p>
            </div>
          </div>
          <button
            onClick={() => downloadKML(pins, city, dest?.EMOJI || '📍', dest?.CITY)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#34a853', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2d9249'}
            onMouseLeave={e => e.currentTarget.style.background = '#34a853'}
          >
            <span>📥</span>
            Download for Google Maps
          </button>
        </div>
      )}

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="rounded-xl p-3" style={{ background: '#1a2020', border: '1px solid rgba(127,182,133,0.15)' }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#7a7870' }}>Filter</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className="text-xs px-2.5 py-1 rounded-full transition-all"
              style={{
                background: activeFilter === 'all' ? 'rgba(127,182,133,0.2)' : 'transparent',
                color: activeFilter === 'all' ? '#7fb685' : '#7a7870',
                border: `1px solid ${activeFilter === 'all' ? 'rgba(127,182,133,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              All ({pins.length})
            </button>
            {categories.map(cat => {
              const cfg = getCat(cat)
              const count = pins.filter(p => (p.type || 'Other') === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(activeFilter === cat ? 'all' : cat)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: activeFilter === cat ? cfg.color + '22' : 'transparent',
                    color: activeFilter === cat ? cfg.color : '#7a7870',
                    border: `1px solid ${activeFilter === cat ? cfg.color + '66' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {cfg.icon} {cfg.label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pin list */}
      <div className="space-y-1.5">
        {filtered.map((pin, i) => (
          <PinRow key={i} pin={pin} city={city} />
        ))}
      </div>

      <p className="text-xs text-center" style={{ color: '#7a7870' }}>
        {validPins.length} of {pins.length} locations mapped · tap any pin to open in Google Maps
      </p>

    </div>
  )
}
