const BASE = '/api'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

// Streaming helper — calls onChunk(text) for each chunk, returns full text
async function stream(path, body, onChunk) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(res.statusText)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return full
      try {
        const { text } = JSON.parse(data)
        full += text
        onChunk(full)
      } catch {}
    }
  }
  return full
}

export const api = {
  getUKAirports:   ()      => get('/uk-airports'),
  getConfig:       ()      => get('/config'),
  getDestAirports: (body)  => post('/dest-airports', body),
  inspire:         (body)  => post('/inspire', body),
  photo:           (query) => get(`/photo?query=${encodeURIComponent(query)}`),
  itinerary:       (body, onChunk) => stream('/itinerary', body, onChunk),
  carHire:         (body)  => post('/car-hire', body),
  accomTips:       (body)  => post('/accom-tips', body),
  hotelNote:       (body)  => post('/hotel-note', body),
  activities:      (body)  => post('/activities', body),
  tweak:           (body, onChunk) => stream('/tweak', body, onChunk),
  mapPins:         (body)  => post('/map-pins', body),
  chat:            (body)  => post('/chat', body),
  nearby:          (body)  => post('/nearby', body),
  history:         (body)  => post('/history', body),
}
