import { useState, useRef } from 'react'

// ── Parser ─────────────────────────────────────────────────────────────────────
// Handles Claude's exact format:
//   ## ✈️ Getting There  /  ## Day 1 — Title  /  ## 💰 Cost Guide  /  ## 📌 Local Tips
//   **🌅 Morning:** inline text...
//   **🍽️ Lunch:**
//   **Restaurant Name** | Location | Type
//   Detail lines...
//   **☀️ Afternoon:** inline text

const IS_TIME  = /^(morning|afternoon|evening|night|late afternoon|early evening)/i
const IS_MEAL  = /^(breakfast|lunch|dinner|brunch|supper)/i
const IS_DAY   = /^##\s+(Day\s*\d+[^#\n]*)/i
const IS_GT    = /^##.*Getting There/i
const IS_GH    = /^##.*Getting Home/i
const IS_COST  = /^##.*Cost/i
const IS_TIPS  = /^##.*Local Tips/i

function stripLeadingEmoji(s) {
  // Remove emoji + variation selectors from the start
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
  let currentBlock = null   // time/activity block
  let pendingMeal  = null   // waiting for restaurant name
  let otherSection = null

  const pushBlock = (b) => { if (b && currentDay) currentDay.blocks.push(b) }

  const flush = () => {
    if (pendingMeal) { pushBlock(pendingMeal); pendingMeal = null }
    if (currentBlock) { pushBlock(currentBlock); currentBlock = null }
  }

  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    if (!line || line === '---' || line === '***') continue

    // ── Section routing ──
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

    // ── Bold line: **...** or **...:** text ──
    const boldM = line.match(/^\*\*(.+?)\*\*:?\s*(.*)$/)
    if (boldM) {
      const rawTitle   = boldM[1].trim()
      const afterColon = boldM[2].trim().replace(/\*\*/g, '')
      const cleanTitle = stripLeadingEmoji(rawTitle).replace(/:$/, '').trim()
      const icon       = leadingEmoji(rawTitle)

      if (IS_TIME.test(cleanTitle)) {
        // Morning / Afternoon / Evening
        flush()
        currentBlock = { isTime: true, title: cleanTitle, icon, details: afterColon ? [afterColon] : [] }

      } else if (IS_MEAL.test(cleanTitle)) {
        // Lunch / Dinner — open a pending meal card
        flush()
        pendingMeal = { isMeal: true, mealType: cleanTitle, icon, restaurantName: null, subtitle: null, details: afterColon ? [afterColon] : [] }

      } else if (pendingMeal && !pendingMeal.restaurantName) {
        // First bold after a meal header = restaurant name
        pendingMeal.restaurantName = cleanTitle
        if (afterColon) pendingMeal.details.push(afterColon)

      } else {
        // Regular activity/place
        flush()
        currentBlock = { isActivity: true, title: cleanTitle, icon, details: afterColon ? [afterColon] : [] }
      }
      continue
    }

    // ── Regular / pipe line ──
    const clean = line.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim()
    if (!clean) continue

    // Pipe line like "| Stari trg | Vegan café" — treat as subtitle of pending meal
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

// Parse cost lines into structured rows
function parseCost(lines) {
  return lines.map(l => {
    const m = l.match(/^(.+?):\s*(.+)$/)
    if (m) return { label: m[1].trim(), value: m[2].trim() }
    return { label: null, value: l }
  })
}

// ── Block renderer — every block is the same card shape ───────────────────────
function Block({ block }) {
  // Determine label, title, icon for every block type
  let label, title, icon, subtitle

  if (block.isTime) {
    label    = block.title   // e.g. "Morning"
    title    = null
    icon     = block.icon
    subtitle = null
  } else if (block.isMeal) {
    label    = block.mealType        // e.g. "Lunch"
    title    = block.restaurantName  // e.g. "Lavinia Good Food"
    icon     = block.icon
    subtitle = block.subtitle
  } else {
    label    = null
    title    = block.title
    icon     = block.icon
    subtitle = block.subtitle || null
  }

  return (
    <div className="rounded-xl p-4 mb-3" style={{
      background: '#1a2020',
      border: '1px solid rgba(127,182,133,0.15)',
    }}>
      {/* Label row — always gold, uppercase, small */}
      {label && (
        <div className="flex items-center gap-1.5 mb-2">
          {icon && <span className="text-sm leading-none">{icon}</span>}
          <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#7fb685'}}>{label}</span>
        </div>
      )}

      {/* Title row */}
      {title && (
        <div className="flex items-start gap-2 mb-1">
          {!label && icon && <span className="shrink-0 text-base leading-tight">{icon}</span>}
          <p className="font-semibold text-sm leading-snug" style={{color:'#f0ede8'}}>{title}</p>
        </div>
      )}

      {/* Subtitle — location / type */}
      {subtitle && (
        <p className="text-xs mb-1.5" style={{color:'#7a7870'}}>{subtitle}</p>
      )}

      {/* Detail lines */}
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
      {/* Total first — most important number */}
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
      {/* Breakdown */}
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

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function ItineraryModal({
  itinerary, dest, destData, prefs, flightDetails, selectedHotel,
  feedback, setFeedback, onTweak, tweaking,
  onSave, saving, saved, user,
  activities, fetchActivities,
  skyscannerUrl, bookingUrl, carHireUrl,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [activeDay, setActiveDay] = useState(0)
  const scrollRef = useRef(null)

  const { days, sections } = parseDays(itinerary)
  const scrollTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  const tabs = [
    { id: 'overview', label: '🗺️ Overview'     },
    { id: 'days',     label: '📅 Day by Day'   },
    { id: 'booking',  label: '🛒 Book' },
    { id: 'local',    label: '💡 Local Tips'   },
  ]

  const fmtDate = (iso) => {
    if (!iso) return null
    try { return new Date(iso).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) }
    catch { return iso }
  }

  // Add Getting There blocks into Day 1
  const daysWithTransfer = days.map((day, i) => {
    let blocks = [...day.blocks]

    // Prepend Getting There to Day 1
    if (i === 0 && sections.getting_there.length > 0) {
      blocks = [{ isActivity: true, title: 'Getting There', icon: '✈️', details: sections.getting_there }, ...blocks]
    }

    // Append Getting Home to last day
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

              {/* Inspire card content */}
              {destData && (
                <div className="rounded-xl p-4 space-y-3" style={{background:'rgba(127,182,133,0.06)', border:'1px solid rgba(127,182,133,0.25)'}}>
                  {destData.TAGLINE && (
                    <p className="font-serif text-base italic" style={{color:'#f0ede8'}}>"{destData.TAGLINE}"</p>
                  )}
                  {destData.BUDGET_NOTE && (
                    <p className="text-sm leading-relaxed" style={{color:'#c8c4bc'}}>💰 {destData.BUDGET_NOTE}</p>
                  )}
                  {destData.WEATHER && (
                    <p className="text-sm leading-relaxed" style={{color:'#c8c4bc'}}>🌤️ {destData.WEATHER}</p>
                  )}
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
                  {destData.DISH && (
                    <p className="text-xs" style={{color:'#7a7870'}}>🍴 Must try: <span style={{color:'#a0a098'}}>{destData.DISH}</span></p>
                  )}
                </div>
              )}

              {/* Trip at a glance */}
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

          {/* ── BOOK ── */}
          {activeTab === 'booking' && (
            <div className="space-y-4">

              {/* Flights */}
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
                     style={{background:'#0077CC', color:'#fff'}}>
                    Search on Skyscanner →
                  </a>
                </div>
              )}

              {/* Hotels */}
              {bookingUrl && (
                <div className="rounded-xl p-4" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.2)'}}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:'#7fb685'}}>🏨 Hotels</p>
                  <p className="text-xs mb-3" style={{color:'#7a7870'}}>
                    {selectedHotel ? `Staying at ${selectedHotel}` : `Hotels in ${dest?.CITY}`}
                  </p>
                  <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
                     className="block w-full text-center py-2.5 rounded-lg text-sm font-medium"
                     style={{background:'#003580', color:'#fff'}}>
                    Explore on Booking.com →
                  </a>
                </div>
              )}

              {/* Car hire */}
              {carHireUrl && (
                <div className="rounded-xl p-4" style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.2)'}}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:'#7fb685'}}>🚗 Car Hire</p>
                  <p className="text-xs mb-3" style={{color:'#7a7870'}}>Compare prices from all major providers</p>
                  <a href={carHireUrl} target="_blank" rel="noopener noreferrer"
                     className="block w-full text-center py-2.5 rounded-lg text-sm font-medium"
                     style={{background:'#e8750a', color:'#fff'}}>
                    Compare on Rentalcars →
                  </a>
                </div>
              )}

              {/* Activities */}
              <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(127,182,133,0.2)'}}>
                <div className="px-4 py-2.5" style={{background:'rgba(127,182,133,0.12)'}}>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{color:'#7fb685'}}>🎟️ Activities & Experiences</p>
                </div>
                <div className="p-4" style={{background:'#1a2020'}}>
                  {activities === null ? (
                    <div className="text-center py-2">
                      <p className="text-sm mb-3" style={{color:'#a0a098'}}>Find out what to book in advance for this trip.</p>
                      <button className="btn-primary px-6 text-sm" onClick={fetchActivities}>Find things to book</button>
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-sm" style={{color:'#a0a098'}}>No specific advance bookings needed.</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((a,i) => (
                        <div key={i} className="flex items-start justify-between gap-3 pb-3 border-b last:border-0"
                             style={{borderColor:'rgba(255,255,255,0.06)'}}>
                          <div>
                            <p className="font-medium text-sm" style={{color:'#f0ede8'}}>{a.name}</p>
                            <p className="text-xs mt-0.5" style={{color:'#a0a098'}}>{a.why_book_ahead}</p>
                          </div>
                          <a href={a.gyg_url} target="_blank" rel="noopener noreferrer"
                             className="shrink-0 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
                             style={{background:'rgba(127,182,133,0.15)', color:'#7fb685',
                                     border:'1px solid rgba(127,182,133,0.25)'}}>
                            Book →
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── LOCAL TIPS ── */}
          {activeTab === 'local' && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest mb-3" style={{color:'#7a7870'}}>Local knowledge for {dest?.CITY}</p>

              {sections.tips.length > 0 && sections.tips.map((tip, i) => (
                <div key={i} className="rounded-xl p-4 flex items-start gap-3"
                     style={{background:'#1a2020', border:'1px solid rgba(127,182,133,0.15)'}}>
                  <span className="shrink-0">📌</span>
                  <p className="text-sm leading-relaxed" style={{color:'#c8c4bc'}}>{tip}</p>
                </div>
              ))}

              {[
                { icon:'🚌', title:'Getting around',  tip:'Google Maps works well in most European cities for public transport routing. Download offline maps before you go.' },
                { icon:'💶', title:'Cash & cards',    tip:'Most places accept cards but carry some local currency for markets, small cafés and tips.' },
                { icon:'🗣️', title:'Language',        tip:'A few basic words in the local language go a long way — locals really appreciate the effort.' },
                { icon:'📱', title:'Useful apps',     tip:'Download Google Translate with offline language packs before you travel.' },
                { icon:'🚨', title:'Emergencies',     tip:'112 works as an emergency number across Europe. Save your hotel address in the local language on your phone.' },
              ].map((tip, i) => (
                <div key={`g${i}`} className="rounded-xl p-4 flex items-start gap-3"
                     style={{background:'#1a2020', border:'1px solid rgba(255,255,255,0.08)'}}>
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <div>
                    <p className="font-medium text-sm mb-1" style={{color:'#f0ede8'}}>{tip.title}</p>
                    <p className="text-sm" style={{color:'#a0a098'}}>{tip.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t px-4 py-3 space-y-2"
           style={{background:'#111614', borderColor:'rgba(255,255,255,0.08)'}}>
        <div className="flex gap-2">
          <input className="input flex-1 text-sm"
            placeholder="Request changes… e.g. more food focus, swap day 2"
            value={feedback} onChange={e => setFeedback(e.target.value)}
            onKeyDown={e => e.key==='Enter' && onTweak()} />
          <button className="btn-primary px-4" onClick={onTweak} disabled={tweaking||!feedback.trim()}>
            {tweaking ? '…' : '↺'}
          </button>
        </div>
        {user ? (
          <button className="btn-primary w-full text-sm" onClick={onSave} disabled={saving}>
            {saving ? '…' : saved ? '✓ Saved!' : '💾 Save this trip'}
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
