import { useState, useEffect } from 'react'
import { getTrips, deleteTrip } from '../utils/supabase'
import ReactMarkdown from 'react-markdown'

export default function MyTrips({ onLoadTrip }) {
  const [trips,   setTrips]   = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getTrips()
      .then(setTrips)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip?')) return
    await deleteTrip(id)
    setTrips(t => t.filter(trip => trip.id !== id))
  }

  const fmt = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <p className="text-slate-3 text-sm italic">Loading your trips…</p>

  if (trips.length === 0) return (
    <div className="card text-center py-8">
      <p className="text-2xl mb-2">🗺️</p>
      <p className="text-slate font-medium">No saved trips yet</p>
      <p className="text-slate-3 text-sm mt-1">Build an itinerary and save it to see it here</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {trips.map(trip => (
        <div key={trip.id} className="card-gold">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{trip.emoji || '🌍'}</span>
                <div>
                  <h3 className="font-serif text-sage-light">
                    {trip.destination}{trip.country ? `, ${trip.country}` : ''}
                  </h3>
                  <p className="text-xs text-slate-3">Saved {fmt(trip.updated_at)}</p>
                </div>
              </div>
              {trip.hotel && (
                <p className="text-xs text-slate mt-1">🏨 {trip.hotel}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                className="btn-primary text-xs px-3 py-1.5"
                onClick={() => onLoadTrip(trip)}
              >
                Load →
              </button>
              <button
                className="btn-danger text-xs px-3 py-1.5"
                onClick={() => handleDelete(trip.id)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Expandable itinerary preview */}
          {trip.itinerary && (
            <div className="mt-3">
              <button
                className="text-xs text-sage hover:text-sage-light transition-colors"
                onClick={() => setExpanded(expanded === trip.id ? null : trip.id)}
              >
                {expanded === trip.id ? '▲ Hide itinerary' : '▼ Preview itinerary'}
              </button>
              {expanded === trip.id && (
                <div className="mt-3 max-h-64 overflow-y-auto border-t border-white/8 pt-3
                  prose prose-invert prose-sm max-w-none
                  prose-headings:font-serif prose-headings:text-sage-light
                  prose-p:text-slate prose-li:text-slate">
                  <ReactMarkdown>{trip.itinerary}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
