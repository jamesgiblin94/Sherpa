import { useState, useRef, useEffect } from 'react'
import SherpaSpinner from './SherpaSpinner'
import { api } from '../utils/api'
import { track } from '../utils/analytics'

// ── Parser ─────────────────────────────────────────────────────────────────────
const IS_TIME  = /^(morning|afternoon|evening|night|late afternoon|early evening)/i
const IS_MEAL  = /^(breakfast|lunch|dinner|brunch|supper)/i
const IS_DAY   = /^##\s+(Day\s*\d+[^#\n]*)/i
const IS_GT    = /^##.*Getting There/i
const IS_GH    = /^##.*Getting Home/i
const IS_COST  = /^##.*Cost/i
const IS_TIPS  = /^##.*Local Tips/i

function stripLeadingEmoji(s) {
  return s.replace(/^[\p{Emoji}\uFE0F\u20E3\s]+/u, '').trim()
}

function leadingEmoji(s) {
  const m = s.match(/^([\p{Emoji}\uFE0F]+)/u)
  return m ? m[1].replace(/\uFE0F/g, '').trim() : null
}

function parseDays(markdown) {
  if (!markdown) return { days: [], sections: {} }

  const sections = { getting_there: [], cost: [], tips: [], getting_home: [] }
  const days = []

  let currentDay   = null
  let currentBlock = null
  let pendingMeal  = null
  let otherSection = null

  const pushBlock = (b) => { if (b && currentDay) currentDay.blocks.push(b) }

  const flush = () => {
    if (pendingMeal) { pushBlock(pendingMeal); pendingMeal = null }
    if (currentBlock) { pushBlock(currentBlock); currentBlock = null }
  }

  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    if (!line || line === '---' || line === '***') continue

    if (IS_GT.test(line))   { flush(); otherSection = 'getting_there'; currentDay = null; continue }
    if (IS_GH.test(line))   { flush(); otherSection = 'getting_home';  currentDay = null; continue }
    if (IS_COST.test(line)) { flush(); otherSection = 'cost';          currentDay = null; continue }
    if (IS_TIPS.test(line)) { flush(); otherSection = 'tips';          currentDay = null; continue }

    const dayM = line.match(IS_DAY)
    if (dayM) {
      flush()
      currentDay   = { title: dayM[1].trim(), blocks: [] }
      otherSection = null
      days.push(currentDay)
      continue
    }

    if (otherSection) {
      const clean = line.replace(/\*\*/g, '').replace(/^[-•]\s*/, '').trim()
      if (clean) sections[otherSection].push(clean)
      continue
    }

    if (!currentDay) continue

    const boldM = line.match(/^\*\*(.+?)\*\*:?\s*(.*)$/)
    if (boldM) {
      const rawTitle   = boldM[1].trim()
      const afterColon = boldM[2].trim().replace(/\*\*/g, '')
      const cleanTitle = stripLeadingEmoji(rawTitle).replace(/:$/, '').trim()
      const icon       = leadingEmoji(rawTitle)

      if (IS_TIME.test(cleanTitle)) {
        flush()
        currentBlock = { isTime: true, title: cleanTitle, icon, details: afterColon ? [afterColon] : [] }
      } else if (IS_MEAL.test(cleanTitle)) {
        flush()
        pendingMeal = { isMeal: true, mealType: cleanTitle, icon, restaurantName: null, subtitle: null, details: afterColon ? [afterColon] : [] }
      } else if (pendingMeal && !pendingMeal.restaurantName) {
        pendingMeal.restaurantName = cleanTitle
        if (afterColon) pendingMeal.details.push(afterColon)
      } else {
        flush()
        currentBlock = { isActivity: true, title: cleanTitle, icon, details: afterColon ? [afterColon] : [] }
      }
      continue
    }

    const clean = line.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim()
    if (!clean) continue

    if (clean.startsWith('|') && pendingMeal) {
      pendingMeal.subtitle = clean.replace(/\|/g, '·').replace(/·\s*·/g, '·').trim().replace(/^·|·$/g, '').trim()
      continue
    }

    if (pendingMeal)  { pendingMeal.details.push(clean); continue }
    if (currentBlock) { currentBlock.details.push(clean); continue }
  }

  flush()
  return { days, sections }
}

function parseCost(lines) {
  return lines.map(l => {
    const m = l.match(/^(.+?):\s*(.+)$/)
    if (m) return { label: m[1].trim(), value: m[2].trim() }
    return { label: null, value: l }
  })
}

// ── Block renderer ────────────────────────────────────────────────────────────
function Block({ block }) {
  let label, title, icon, subtitle

  if (block.isTime) {
    label = block.title; title = null; icon = block.icon; subtitle = null
  } else if (block.isMeal) {
    label = block.mealType; title = block.restaurantName; icon = block.icon; subtitle = block.subtitle
  } else {
    label = null; title = block.title; icon = block.icon; subtitle = block.subtitle || null
  }

  return (
    <div className="rounded-xl p-4 mb-3" style={{
      background: '#1a2020', border: '1px solid rgba(127,182,133,0.15)',
    }}>
      {label && (
        <div className="flex items-center gap-1.5 mb-2">
          {icon && <span className="text-sm leading-none">{icon}</span>}
          <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#7fb685'}}>{label}</span>
        </div>
      )}
      {title && (
        <div className="flex items-start gap-2 mb-1">
          {!label && icon && <span className="shrink-0 text-base leading-tight">{icon}</span>}
          <p className="font-semibold text-sm leading-snug" style={{color:'#f0ede8'}}>{title}</p>
        </div>
      )}
      {subtitle && <p className="text-xs mb-1.5" style={{color:'#7a7870'}}>{subtitle}</p>}
      {block.details.map((d, i) => (
        <p key={i} className="text-sm leading-relaxed mt-1" style={{color:'#a0a098'}}>{d}</p>
      ))}
    </div>
  )
}

// ── Cost card ──────────────────────────────────────────────────────────────────
const COST_ICONS = {
  flight: '✈️', accommodation: '🏨', hotel: '🏨', food: '🍽️',
  drink: '🍷', activities: '🎟️', activity: '🎟️', transport: '🚌',
  car: '🚗', total: '💰', estimated: '💰',
}

function getCostIcon(label) {
  const l = label.toLowerCase()
  for (const [key, icon] of Object.entries(COST_ICONS)) {
    if (l.includes(key)) return icon
  }
  return '•'
}

function CostGuide({ lines }) {
  const rows = parseCost(lines)
  const total = rows.find(r => r.label?.toLowerCase().includes('total') || r.label?.toLowerCase().includes('estimated'))
  const rest  = rows.filter(r => r !== total && r.label)
  return (
    <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(127,182,133,0.25)'}}>
      {total && (
        <div className="px-4 py-4 flex items-center justify-between"
             style={{background:'linear-gradient(135deg, rgba(127,182,133,0.2) 0%, rgba(127,182,133,0.08) 100%)'}}>
          <div>
            <p className="text-xs uppercase tracking-widest mb-0.5" style={{color:'#7fb685'}}>Estimated total</p>
            <p className="text-2xl font-serif font-bold" style={{color:'#f0ede8'}}>{total.value}</p>
            <p className="text-xs mt-0.5" style={{color:'#7a7870'}}>per person, excluding accommodation</p>
          </div>
          <span className="text-3xl">💰</span>
        </div>
      )}
      <div style={{background:'#1a2020'}}>
        <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-widest" style={{color:'#7a7870'}}>Breakdown</p>
        {rest.map((r, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b"
               style={{borderColor:'rgba(255,255,255,0.05)'}}>
            <span className="text-lg w-7 text-center shrink-0">{getCostIcon(r.label)}</span>
            <span className="text-sm flex-1" style={{color:'#a0a098'}}>{r.label}</span>
            <span className="text-sm font-medium" style={{color:'#c8c4bc'}}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day photo ──────────────────────────────────────────────────────────────────
const DAY_PHOTO_CACHE = {}

function DayPhoto({ day, destCity }) {
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!day || !destCity) return
    const firstActivity = day.blocks?.find(b => !b.isTime && b.title)?.title || ''
    const query = firstActivity ? `${destCity} ${firstActivity}` : `${destCity} travel`
    const cacheKey = query

    if (DAY_PHOTO_CACHE[cacheKey]) { setPhoto(DAY_PHOTO_CACHE[cacheKey]); return }

    api.photo(query)
      .then(p => { if (p?.url) { DAY_PHOTO_CACHE[cacheKey] = p; setPhoto(p) } })
      .catch(() => {})
  }, [day?.title, destCity])

  if (!photo) return null

  return (
    <div className="relative rounded-xl overflow-hidden mb-4" style={{height: 160}}>
      <img src={photo.url} alt="" className="w-full h-full object-cover" style={{filter:'brightness(0.75)'}} />
      <div className="absolute inset-0" style={{background:'linear-gradient(to top, #111614 0%, transparent 60%)'}} />
      {photo.credit && (
        <a href={photo.credit_url} target="_blank" rel="noopener noreferrer"
           className="absolute bottom-2 right-2 text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
          📷 {photo.credit}
        </a>
      )}
    </div>
  )
}

// ── Venue card with photo ──────────────────────────────────────────────────────
function VenueCard({ venue, typeIcon, destCity }) {
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    api.photo(`${venue.name} ${destCity} restaurant food`)
      .then(p => { if (p?.url) setPhoto(p) })
      .catch(() => {})
  }, [venue.name])

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg overflow-hidden" style={{width:56, height:56, background:'#222b28'}}>
          {photo
            ? <img src={photo.thumb || photo.url} alt={venue.name} className="w-full h-full object-cover" style={{filter:'brightness(0.9)'}} />
            : <div className="w-full h-full flex items-center justify-center text-xl">{typeIcon}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-medium text-sm truncate" style={{color:'#f0ede8'}}>{venue.name}</p>
          </div>
          <p className="text-xs leading-relaxed" style={{color:'#a0a098'}}>{venue.note}</p>
        </div>
        <a href={venue.instagram_url} target="_blank" rel="noopener noreferrer"
           className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1"
           style={{background:'rgba(131,58,180,0.12)', color:'#c084fc', border:'1px solid rgba(131,58,180,0.25)'}}>
          📸
        </a>
      </div>
    </div>
  )
}

// ── Language phrase lookup ─────────────────────────────────────────────────────
const PHRASE_CACHE = {}

function LanguagePhrase({ dest, phrase }) {
  const [translation, setTranslation] = useState(null)

  useEffect(() => {
    if (!dest) return
    const key = `${dest}:${phrase}`
    if (PHRASE_CACHE[key]) { setTranslation(PHRASE_CACHE[key]); return }

    api.chat({
      message: `What is "${phrase}" in the local language of ${dest}? Reply with ONLY the translated phrase and pronunciation in brackets, nothing else. Example format: Grazie (GRAT-see-eh)`,
      context: '',
    }).then(r => {
      const t = r.reply?.trim() || '—'
      PHRASE_CACHE[key] = t
      setTranslation(t)
    }).catch(() => setTranslation('—'))
  }, [dest, phrase])

  return (
    <span className="text-xs font-medium" style={{color:'#a8c9ad'}}>
      {translation || '…'}
    </span>
  )
}

// ── Map category config ────────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  Restaurant: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', icon: '🍽️', label: 'Restaurants' },
  Cafe:       { color: '#d97706', bg: 'rgba(217,119,6,0.15)',  border: 'rgba(217,119,6,0.3)',  icon: '☕',  label: 'Cafes' },
  Bar:        { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', icon: '🍸',  label: 'Bars' },
  Museum:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', icon: '🏛️', label: 'Museums' },
  Attraction: { color: '#eab308', bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.3)',  icon: '⭐',  label: 'Attractions' },
  Market:     { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.3)',  icon: '🛒',  label: 'Markets' },
  Park:       { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: '🌿',  label: 'Parks' },
  Viewpoint:  { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',  border: 'rgba(6,182,212,0.3)',  icon: '👁️', label: 'Viewpoints' },
  Beach:      { color: '#14b8a6', bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.3)', icon: '🏖️', label: 'Beaches' },
  Hotel:      { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',  icon: '🏨',  label: 'Hotels' },
}

const DEFAULT_CAT = { color: '#a0a098', bg: 'rgba(160,160,152,0.15)', border: 'rgba(160,160,152,0.3)', icon: '📍', label: 'Other' }

function getCat(type) {
  return CATEGORY_CONFIG[type] || DEFAULT_CAT
}

function groupByCategory(pins) {
  const groups = {}
  for (const pin of pins) {
    const cat = pin.type || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(pin)
  }
  return groups
}

function pinMapsUrl(name, city) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + city)}`
}

// ── Geocode using Nominatim (free, no API key) ────────────────────────────────
const GEOCODE_CACHE = {}

async function geocodePin(name, city) {
  const key = `${name}|${city}`
  if (GEOCODE_CACHE[key]) return GEOCODE_CACHE[key]

  try {
    const q = encodeURIComponent(`${name}, ${city}`)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'en' }
    })
    const data = await res.json()
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      GEOCODE_CACHE[key] = result
      return result
    }
  } catch {}

  try {
    const q = encodeURIComponent(name)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'en' }
    })
    const data = await res.json()
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      GEOCODE_CACHE[key] = result
      return result
    }
  } catch {}

  return null
}

async function geocodeAllPins(pins, city) {
  const results = []
  for (const pin of pins) {
    const coords = await geocodePin(pin.name, city)
    if (coords) {
      results.push({ ...pin, lat: coords.lat, lng: coords.lng })
    } else {
      results.push({ ...pin, lat: null, lng: null })
    }
    await new Promise(r => setTimeout(r, 300))
  }
  return results
}

// ── KML file generation ────────────────────────────────────────────────────────
function generateKML(pins, city, emoji) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  function hexToKml(hex) {
    const r = hex.slice(1, 3)
    const g = hex.slice(3, 5)
    const b = hex.slice(5, 7)
    return `ff${b}${g}${r}`
  }

  const validPins = pins.filter(p => p.lat && p.lng)

  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${esc(emoji + ' ' + city + ' Itinerary')}</name>
  <description>Generated by Sherpa - sherpatravel.uk</description>
`

  const usedCats = [...new Set(validPins.map(p => p.type || 'Other'))]
  for (const cat of usedCats) {
    const cfg = getCat(cat)
    kml += `  <Style id="style-${esc(cat)}">
    <IconStyle>
      <color>${hexToKml(cfg.color)}</color>
      <scale>1.2</scale>
      <Icon>
        <href>https://maps.google.com/mapfiles/kml/paddle/${cfg.color.replace('#', '').toUpperCase().slice(0,2)}.png</href>
      </Icon>
    </IconStyle>
    <LabelStyle>
      <color>${hexToKml(cfg.color)}</color>
    </LabelStyle>
  </Style>
`
  }

  for (const cat of usedCats) {
    const cfg = getCat(cat)
    const catPins = validPins.filter(p => (p.type || 'Other') === cat)
    kml += `  <Folder>
    <name>${esc(cfg.icon + ' ' + cfg.label)}</name>
`
    for (const pin of catPins) {
      kml += `    <Placemark>
      <name>${esc(pin.name)}</name>
      <description>${esc(pin.description || '')}</description>
      <styleUrl>#style-${esc(cat)}</styleUrl>
      <Point>
        <coordinates>${pin.lng},${pin.lat},0</coordinates>
      </Point>
    </Placemark>
`
    }
    kml += `  </Folder>
`
  }

  kml += `</Document>
</kml>`

  return kml
}

function downloadKML(pins, city, emoji, destCity) {
  track('map_export', { format: 'kml', destination: destCity })
  const kml = generateKML(pins, city, emoji)
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${city.toLowerCase().replace(/\s+/g, '-')}-itinerary.kml`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Map Pin Card ───────────────────────────────────────────────────────────────
function MapPinCard({ pin, city }) {
  const cat = getCat(pin.type)
  const hasCoords = pin.lat && pin.lng
  return (
    <a href={pinMapsUrl(pin.name, city)} target="_blank" rel="noopener noreferrer"
       className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
       style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
       onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.borderColor = cat.color }}
       onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.borderColor = cat.border }}>
      <span className="text-lg shrink-0">{cat.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{color:'#f0ede8'}}>{pin.name}</p>
        {pin.description && (
          <p className="text-xs truncate" style={{color: cat.color}}>{pin.description}</p>
        )}
      </div>
      {!hasCoords && <span className="text-xs shrink-0" style={{color:'#7a7870'}}>📍</span>}
      <span className="text-xs shrink-0" style={{color:'#7a7870'}}>Open ↗</span>
    </a>
  )
}

// ── Leaflet Map Component ──────────────────────────────────────────────────────
function LeafletMap({ pins, city }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) { resolve(window.L); return }
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => resolve(window.L)
        document.head.appendChild(script)
      })
    }

    const validPins = pins.filter(p => p.lat && p.lng)
    if (validPins.length === 0 || !mapRef.current) return

    loadLeaflet().then(L => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true })
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map)

      const markers = []
      for (const pin of validPins) {
        const cat = getCat(pin.type)

        const iconHtml = `<div style="
          width: 32px; height: 32px;
          background: ${cat.color};
          border: 2px solid #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; line-height: 1;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        ">${cat.icon}</div>`

        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        })

        const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map)
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:140px;">
            <strong style="font-size:13px;">${cat.icon} ${pin.name}</strong>
            ${pin.description ? `<br/><span style="font-size:11px;color:#666;">${pin.description}</span>` : ''}
            <br/><a href="${pinMapsUrl(pin.name, city)}" target="_blank" style="font-size:11px;color:#4285f4;">Open in Google Maps ↗</a>
          </div>
        `)
        markers.push(marker)
      }

      if (markers.length > 0) {
        const group = L.featureGroup(markers)
        map.fitBounds(group.getBounds().pad(0.15))
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [pins])

  const validCount = pins.filter(p => p.lat && p.lng).length
  if (validCount === 0) return null

  return (
    <div ref={mapRef} className="rounded-xl overflow-hidden" style={{height: 320, border:'1px solid rgba(127,182,133,0.2)'}} />
  )
}

// ── Map Tab Content ────────────────────────────────────────────────────────────
function MapTab({ dest, itinerary }) {
  const [pins, setPins] = useState(null)
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')

  const city = dest?.CITY || ''

  const handleDownloadCSV = () => {
    track('map_export', { format: 'csv', destination: dest?.CITY })
    const validPins = pins.filter(p => p.lat && p.lng)
    const rows = [['Name', 'Category', 'Description', 'Latitude', 'Longitude']]
    for (const pin of validPins) {
      const cat = getCat(pin.type)
      rows.push([
        pin.name,
        cat.label,
        (pin.description || '').replace(/,/g, ';'),
        pin.lat,
        pin.lng,
      ])
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${city.toLowerCase().replace(/\s+/g, '-')}-itinerary.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!itinerary || !dest?.CITY || pins) return
    setLoading(true)
    api.mapPins({ itinerary, dest_city: dest.CITY })
      .then(async (d) => {
        const rawPins = d.locations || []
        setLoading(false)
        setGeocoding(true)
        const geocoded = await geocodeAllPins(rawPins, dest.CITY)
        setPins(geocoded)
        setGeocoding(false)
      })
      .catch(() => { setPins([]); setLoading(false) })
  }, [itinerary, dest?.CITY])

  if (loading) {
    return (
      <div className="py-8">
        <SherpaSpinner messages={['Mapping your itinerary...', 'Finding all the spots...', 'Pinning locations...']} />
      </div>
    )
  }

  if (!pins || pins.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{color:'#a0a098'}}>No map pins found for this itinerary.</p>
      </div>
    )
  }

  const grouped = groupByCategory(pins)
  const categories = Object.keys(grouped).sort()
  const filteredPins = activeFilter === 'all' ? pins : pins.filter(p => (p.type || 'Other') === activeFilter)
  const geocodedCount = pins.filter(p => p.lat && p.lng).length

  return (
    <div className="space-y-4">

      {geocoding && (
        <div className="rounded-xl p-4 text-center" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.15)'}}>
          <SherpaSpinner messages={['Placing pins on the map...', 'Finding coordinates...', 'Nearly there...']} />
        </div>
      )}

      {!geocoding && geocodedCount > 0 && (
        <LeafletMap pins={filteredPins} city={city} />
      )}

      {!geocoding && geocodedCount > 0 && (
        <div className="rounded-xl p-4 space-y-4" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.2)'}}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{color:'#7fb685'}}>
            Export to Google Maps
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => downloadKML(pins, city, dest?.EMOJI || '📍', dest?.CITY)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all"
              style={{background:'#34a853', color:'#fff'}}
              onMouseEnter={e => e.currentTarget.style.background='#2d9249'}
              onMouseLeave={e => e.currentTarget.style.background='#34a853'}>
              <span>📥</span>
              KML file
            </button>

            <button
              onClick={handleDownloadCSV}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all"
              style={{background:'#4285f4', color:'#fff'}}
              onMouseEnter={e => e.currentTarget.style.background='#3367d6'}
              onMouseLeave={e => e.currentTarget.style.background='#4285f4'}>
              <span>📊</span>
              CSV file
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg p-3" style={{background:'rgba(52,168,83,0.08)', border:'1px solid rgba(52,168,83,0.15)'}}>
              <p className="text-xs font-semibold mb-1.5" style={{color:'#34a853'}}>📱 Mobile (KML)</p>
              <div className="space-y-1">
                <p className="text-xs" style={{color:'#a0a098'}}>1. Download the KML file</p>
                <p className="text-xs" style={{color:'#a0a098'}}>2. Open it and select Google Maps</p>
                <p className="text-xs" style={{color:'#a0a098'}}>3. All pins appear on your map instantly</p>
              </div>
            </div>

            <div className="rounded-lg p-3" style={{background:'rgba(66,133,244,0.08)', border:'1px solid rgba(66,133,244,0.15)'}}>
              <p className="text-xs font-semibold mb-1.5" style={{color:'#4285f4'}}>💻 Desktop (CSV)</p>
              <div className="space-y-1">
                <p className="text-xs" style={{color:'#a0a098'}}>1. Download the CSV file</p>
                <p className="text-xs" style={{color:'#a0a098'}}>2. Go to <a href="https://www.google.com/maps/d/" target="_blank" rel="noopener noreferrer" style={{color:'#4285f4', textDecoration:'underline'}}>Google My Maps</a> and create a new map</p>
                <p className="text-xs" style={{color:'#a0a098'}}>3. Click Import and upload the CSV</p>
                <p className="text-xs" style={{color:'#a0a098'}}>4. Select Latitude and Longitude as position columns</p>
                <p className="text-xs" style={{color:'#a0a098'}}>5. Select Name as the title column</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl p-3" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.15)'}}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{color:'#7a7870'}}>Filter by category</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className="text-xs px-2.5 py-1 rounded-full transition-all"
            style={{
              background: activeFilter === 'all' ? 'rgba(127,182,133,0.2)' : 'transparent',
              color: activeFilter === 'all' ? '#7fb685' : '#7a7870',
              border: `1px solid ${activeFilter === 'all' ? 'rgba(127,182,133,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}>
            All ({pins.length})
          </button>
          {categories.map(cat => {
            const cfg = getCat(cat)
            const count = grouped[cat].length
            return (
              <button key={cat}
                onClick={() => setActiveFilter(activeFilter === cat ? 'all' : cat)}
                className="text-xs px-2.5 py-1 rounded-full transition-all"
                style={{
                  background: activeFilter === cat ? cfg.bg : 'transparent',
                  color: activeFilter === cat ? cfg.color : '#7a7870',
                  border: `1px solid ${activeFilter === cat ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                }}>
                {cfg.icon} {cfg.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs" style={{color:'#7a7870'}}>
        Showing {filteredPins.length} of {pins.length} locations
        {geocodedCount < pins.length && ` · ${geocodedCount} mapped`}
      </p>

      <div className="space-y-2">
        {activeFilter === 'all' ? (
          categories.map(cat => {
            const cfg = getCat(cat)
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                  <span>{cfg.icon}</span>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{color: cfg.color}}>
                    {cfg.label}
                  </p>
                  <div className="flex-1 h-px" style={{background: cfg.border}} />
                </div>
                <div className="space-y-1.5">
                  {grouped[cat].map((pin, i) => (
                    <MapPinCard key={i} pin={pin} city={city} />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div className="space-y-1.5">
            {filteredPins.map((pin, i) => (
              <MapPinCard key={i} pin={pin} city={city} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function ItineraryModal({
  itinerary, dest, destData, prefs, flightDetails, selectedHotel,
  feedback, setFeedback, onTweak, tweaking,
  onSave, saving, saved, user,
  activities, fetchActivities, activitiesLoading,
  skyscannerUrl, bookingUrl, carHireUrl,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [photos, setPhotos] = useState([])
  const [activeDay, setActiveDay] = useState(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!dest?.CITY) return
    const queries = [
      dest.CITY,
      ...(destData?.highlights?.slice(0, 3) || []).map(h => `${dest.CITY} ${h}`)
    ].slice(0, 4)

    Promise.all(queries.map(q => api.photo(q).catch(() => ({ url: null }))))
      .then(results => setPhotos(results.filter(p => p.url)))
  }, [dest?.CITY])

  const { days, sections } = parseDays(itinerary)
  const scrollTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  const tabs = [
    { id: 'overview', label: '🗺️ Overview'   },
    { id: 'days',     label: '📅 Day by Day'  },
    { id: 'map',      label: '📍 Map'         },
    { id: 'booking',  label: '🛒 Book'        },
    { id: 'local',    label: '💡 Local Tips'  },
  ]

  const fmtDate = (iso) => {
    if (!iso) return null
    try { return new Date(iso).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) }
    catch { return iso }
  }

  const daysWithTransfer = days.map((day, i) => {
    let blocks = [...day.blocks]
    if (i === 0 && sections.getting_there.length > 0) {
      blocks = [{ isActivity: true, title: 'Getting There', icon: '✈️', details: sections.getting_there }, ...blocks]
    }
    if (i === days.length - 1 && sections.getting_home.length > 0) {
      blocks = [...blocks, { isActivity: true, title: 'Getting Home', icon: '🏠', details: sections.getting_home }]
    }
    return { ...day, blocks }
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{background:'#0a1520'}}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
           style={{background:'#111614', borderColor:'rgba(127,182,133,0.2)'}}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{dest?.EMOJI}</span>
          <div>
            <h2 className="font-serif text-lg leading-tight" style={{color:'#f0ede8'}}>{dest?.CITY}</h2>
            <p className="text-xs" style={{color:'#7a7870'}}>{days.length} day itinerary</p>
          </div>
        </div>
        <button onClick={onClose} className="text-2xl leading-none"
                style={{color:'#7a7870'}}
                onMouseEnter={e=>e.target.style.color='#7fb685'}
                onMouseLeave={e=>e.target.style.color='#7a7870'}>✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b shrink-0 overflow-x-auto"
           style={{background:'#111614', borderColor:'rgba(255,255,255,0.06)'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); scrollTop() }}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              background: activeTab===t.id ? '#7fb685' : 'transparent',
              color:      activeTab===t.id ? '#111614' : '#a0a098',
              border:     activeTab===t.id ? 'none'    : '1px solid rgba(255,255,255,0.1)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto pb-4">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {photos.length > 0 && (
                <div className="flex gap-2 -mx-1">
                  {photos.map((p, i) => (
                    <div key={i} className="flex-1 min-w-0 rounded-xl overflow-hidden"
                         style={{height: 120, flexBasis: `${100/photos.length}%`}}>
                      <img src={p.thumb || p.url} alt="" className="w-full h-full object-cover" style={{filter:'brightness(0.9)'}} />
                    </div>
                  ))}
                </div>
              )}

              {destData && (
                <div className="rounded-xl p-4 space-y-3" style={{background:'rgba(127,182,133,0.06)', border:'1px solid rgba(127,182,133,0.25)'}}>
                  {destData.TAGLINE && <p className="font-serif text-base italic" style={{color:'#f0ede8'}}>"{destData.TAGLINE}"</p>}
                  {destData.BUDGET_NOTE && <p className="text-sm leading-relaxed" style={{color:'#c8c4bc'}}>💰 {destData.BUDGET_NOTE}</p>}
                  {destData.WEATHER && <p className="text-sm leading-relaxed" style={{color:'#c8c4bc'}}>🌤️ {destData.WEATHER}</p>}
                  {destData.highlights?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {destData.highlights.map((h, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                              style={{background:'rgba(127,182,133,0.1)', color:'#c8c4bc', border:'1px solid rgba(127,182,133,0.2)'}}>
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                  {destData.DISH && <p className="text-xs" style={{color:'#7a7870'}}>🍴 Must try: <span style={{color:'#a0a098'}}>{destData.DISH}</span></p>}
                </div>
              )}

              <div className="rounded-xl p-4" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.25)'}}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'#7fb685'}}>Trip at a Glance</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{color:'#7a7870'}}>Destination</span>
                    <span style={{color:'#c8c4bc'}}>{dest?.EMOJI} {dest?.CITY}, {dest?.COUNTRY}</span>
                  </div>
                  {flightDetails?.outboundDate && (
                    <div className="flex justify-between text-sm">
                      <span style={{color:'#7a7870'}}>Outbound</span>
                      <span style={{color:'#c8c4bc'}}>{fmtDate(flightDetails.outboundDate)} · arrive {flightDetails.arrivalTime}</span>
                    </div>
                  )}
                  {flightDetails?.returnDate && (
                    <div className="flex justify-between text-sm">
                      <span style={{color:'#7a7870'}}>Return</span>
                      <span style={{color:'#c8c4bc'}}>{fmtDate(flightDetails.returnDate)} · depart {flightDetails.departureTime}</span>
                    </div>
                  )}
                  {selectedHotel && (
                    <div className="flex justify-between text-sm">
                      <span style={{color:'#7a7870'}}>Staying</span>
                      <span style={{color:'#c8c4bc'}}>{selectedHotel}</span>
                    </div>
                  )}
                  {prefs?.budget && (
                    <div className="flex justify-between text-sm">
                      <span style={{color:'#7a7870'}}>Budget</span>
                      <span style={{color:'#c8c4bc'}}>{prefs.budget}</span>
                    </div>
                  )}
                  {prefs?.groupType && (
                    <div className="flex justify-between text-sm">
                      <span style={{color:'#7a7870'}}>Group</span>
                      <span style={{color:'#c8c4bc'}}>{prefs.groupType} · {prefs.numAdults} adults</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── DAY BY DAY ── */}
          {activeTab === 'days' && (
            <div>
              {daysWithTransfer.length > 1 && (
                <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                  {daysWithTransfer.map((day, i) => (
                    <button key={i} onClick={() => { setActiveDay(i); scrollTop() }}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                      style={{
                        background: activeDay===i ? '#7fb685' : 'transparent',
                        color:      activeDay===i ? '#111614' : '#a0a098',
                        border:     activeDay===i ? 'none'    : '1px solid rgba(255,255,255,0.1)',
                      }}>
                      Day {i+1}
                    </button>
                  ))}
                </div>
              )}

              <h3 className="font-serif text-lg mb-3" style={{color:'#f0ede8'}}>
                {daysWithTransfer[activeDay]?.title}
              </h3>

              <DayPhoto day={daysWithTransfer[activeDay]} destCity={dest?.CITY} />

              {(daysWithTransfer[activeDay]?.blocks || []).map((block, i) => (
                <Block key={i} block={block} />
              ))}

              {daysWithTransfer.length > 1 && (
                <div className="flex gap-2 mt-4">
                  <button disabled={activeDay===0}
                    onClick={() => { setActiveDay(d=>Math.max(0,d-1)); scrollTop() }}
                    className="flex-1 py-2 rounded-lg text-sm"
                    style={{background:'#1a2020', color: activeDay===0?'#3a4a5a':'#c8c4bc',
                            border:'1px solid rgba(255,255,255,0.08)'}}>
                    ← Previous day
                  </button>
                  <button disabled={activeDay===daysWithTransfer.length-1}
                    onClick={() => { setActiveDay(d=>Math.min(daysWithTransfer.length-1,d+1)); scrollTop() }}
                    className="flex-1 py-2 rounded-lg text-sm"
                    style={{background:'#1a2020', color: activeDay===daysWithTransfer.length-1?'#3a4a5a':'#c8c4bc',
                            border:'1px solid rgba(255,255,255,0.08)'}}>
                    Next day →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── MAP ── */}
          {activeTab === 'map' && (
            <MapTab dest={dest} itinerary={itinerary} />
          )}

          {/* ── BOOK ── */}
          {activeTab === 'booking' && (
            <div className="space-y-4">
              {skyscannerUrl && (
                <div className="rounded-xl p-4" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.2)'}}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:'#7fb685'}}>✈️ Flights</p>
                  <p className="text-xs mb-3" style={{color:'#7a7870'}}>
                    {flightDetails?.outboundDate && flightDetails?.returnDate
                      ? `${fmtDate(flightDetails.outboundDate)} — ${fmtDate(flightDetails.returnDate)}`
                      : 'Search for flights to ' + dest?.CITY}
                  </p>
                  <a href={skyscannerUrl} target="_blank" rel="noopener noreferrer"
                     className="block w-full text-center py-2.5 rounded-lg text-sm font-medium"
                     style={{background:'#0077CC', color:'#fff'}}
                     onClick={() => track('affiliate_click', { partner: 'skyscanner', destination: dest?.CITY })}>
                    Search on Skyscanner →
                  </a>
                </div>
              )}

              {bookingUrl && (
                <div className="rounded-xl p-4" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.2)'}}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:'#7fb685'}}>🏨 Hotels</p>
                  <p className="text-xs mb-3" style={{color:'#7a7870'}}>
                    {selectedHotel ? `Staying at ${selectedHotel}` : `Hotels in ${dest?.CITY}`}
                  </p>
                  <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
                     className="block w-full text-center py-2.5 rounded-lg text-sm font-medium"
                     style={{background:'#003580', color:'#fff'}}
                     onClick={() => track('affiliate_click', { partner: 'booking', destination: dest?.CITY })}>
                    Explore on Booking.com →
                  </a>
                </div>
              )}

              {carHireUrl && (
                <div className="rounded-xl p-4" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.2)'}}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:'#7fb685'}}>🚗 Car Hire</p>
                  <p className="text-xs mb-3" style={{color:'#7a7870'}}>Compare prices from all major providers</p>
                  <a href={carHireUrl} target="_blank" rel="noopener noreferrer"
                     className="block w-full text-center py-2.5 rounded-lg text-sm font-medium"
                     style={{background:'#e8750a', color:'#fff'}}
                     onClick={() => track('affiliate_click', { partner: 'rentalcars', destination: dest?.CITY })}>
                    Compare on Rentalcars →
                  </a>
                </div>
              )}

              {activities === null ? (
                <div className="rounded-xl p-5 text-center" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.2)'}}>
                  {activitiesLoading ? (
                    <SherpaSpinner messages={['Finding tours to book...','Checking restaurant reservations...','Spotting must-see museums...','Almost there...']} />
                  ) : (
                    <>
                      <p className="text-sm mb-3" style={{color:'#a0a098'}}>Find out what to book in advance for this trip.</p>
                      <button className="btn-primary px-6 text-sm" onClick={() => fetchActivities && fetchActivities()}>Find things to book</button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.gyg?.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(127,182,133,0.2)'}}>
                      <div className="px-4 py-2.5 flex items-center gap-2" style={{background:'rgba(127,182,133,0.1)'}}>
                        <span>🎟️</span>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{color:'#7fb685'}}>Tours & Experiences</p>
                        <span className="text-xs ml-auto" style={{color:'#7a7870'}}>via GetYourGuide</span>
                      </div>
                      <div className="divide-y" style={{background:'#1a2020', borderColor:'rgba(255,255,255,0.06)'}}>
                        {activities.gyg.map((a, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                            <div className="flex-1">
                              <p className="font-medium text-sm" style={{color:'#f0ede8'}}>{a.name}</p>
                              <p className="text-xs mt-0.5" style={{color:'#a0a098'}}>{a.why_book_ahead}</p>
                            </div>
                            <a href={a.gyg_url} target="_blank" rel="noopener noreferrer"
                               className="shrink-0 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
                               style={{background:'rgba(127,182,133,0.15)', color:'#7fb685', border:'1px solid rgba(127,182,133,0.3)'}}
                               onClick={() => track('affiliate_click', { partner: 'getyourguide', destination: dest?.CITY })}>
                              Book →
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activities.direct?.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(127,182,133,0.15)'}}>
                      <div className="px-4 py-2.5 flex items-center gap-2" style={{background:'rgba(255,255,255,0.04)'}}>
                        <span>📍</span>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{color:'#a0a098'}}>Find on Instagram</p>
                        <span className="text-xs ml-auto" style={{color:'#7a7870'}}>restaurants & bars</span>
                      </div>
                      <div className="divide-y" style={{background:'#1a2020', borderColor:'rgba(255,255,255,0.06)'}}>
                        {activities.direct.map((a, i) => {
                          const typeIcon = {Restaurant:'🍽️', Museum:'🏛️', Attraction:'⭐', Bar:'🍸', Cafe:'☕'}[a.type] || '📍'
                          return <VenueCard key={i} venue={a} typeIcon={typeIcon} destCity={dest?.CITY} />
                        })}
                      </div>
                    </div>
                  )}

                  {activities.gyg?.length === 0 && activities.direct?.length === 0 && (
                    <p className="text-sm text-center py-4" style={{color:'#a0a098'}}>No specific advance bookings needed for this trip.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── LOCAL TIPS ── */}
          {activeTab === 'local' && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest mb-3" style={{color:'#7a7870'}}>Local knowledge for {dest?.CITY}</p>

              {sections.tips.slice(0, 3).map((tip, i) => (
                <div key={i} className="rounded-xl p-4 flex items-start gap-3"
                     style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.15)'}}>
                  <span className="shrink-0" style={{color:'#7fb685'}}>--</span>
                  <p className="text-sm leading-relaxed" style={{color:'#c8c4bc'}}>
                    {tip.replace(/^\d+[\.\)]\s*/, '')}
                  </p>
                </div>
              ))}

              <div className="rounded-xl p-4" style={{background:'#1a2020', border:'1px solid rgba(255,255,255,0.08)'}}>
                <div className="flex items-center gap-2 mb-3">
                  <span>🗣️</span>
                  <p className="font-medium text-sm" style={{color:'#f0ede8'}}>Useful phrases</p>
                </div>
                <div className="space-y-2">
                  {[
                    { phrase: 'Hello',            key: 'hello' },
                    { phrase: 'Please',           key: 'please' },
                    { phrase: 'Thank you',        key: 'thankyou' },
                    { phrase: 'Do you speak English?', key: 'english' },
                    { phrase: 'The bill, please', key: 'bill' },
                  ].map(({ phrase }) => (
                    <div key={phrase} className="flex justify-between items-center py-1.5 border-b last:border-0"
                         style={{borderColor:'rgba(255,255,255,0.05)'}}>
                      <span className="text-xs" style={{color:'#7a7870'}}>{phrase}</span>
                      <LanguagePhrase dest={dest?.CITY} phrase={phrase} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t px-4 py-3 space-y-2"
           style={{background:'#111614', borderColor:'rgba(255,255,255,0.08)'}}>
        <div className="flex gap-2">
          <input className="input flex-1 text-sm"
            placeholder="Request changes... e.g. more food focus, swap day 2"
            value={feedback} onChange={e => setFeedback(e.target.value)}
            onKeyDown={e => e.key==='Enter' && onTweak()} />
          <button className="btn-primary px-4" onClick={onTweak} disabled={tweaking||!feedback.trim()}>
            {tweaking ? '...' : '↺'}
          </button>
        </div>
        {user ? (
          <button className="btn-primary w-full text-sm" onClick={onSave} disabled={saving}>
            {saving ? '...' : saved ? '✓ Saved!' : '💾 Save this trip'}
          </button>
        ) : (
          <button disabled className="w-full py-2 rounded-lg text-sm"
                  style={{background:'#1a2020', color:'#7a7870', border:'1px solid rgba(255,255,255,0.08)'}}>
            💾 Sign in to save this trip
          </button>
        )}
      </div>
    </div>
  )
}
