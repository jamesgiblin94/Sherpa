import { useState } from 'react'

const LIMITS = {
  inspire: 3,
  itinerary: 3,
}

function getCount(key) {
  try {
    return parseInt(localStorage.getItem(`sherpa_usage_${key}`) || '0', 10)
  } catch {
    return 0
  }
}

function incrementCount(key) {
  const next = getCount(key) + 1
  localStorage.setItem(`sherpa_usage_${key}`, String(next))
  return next
}

export function useUsageLimit(key) {
  const [count, setCount] = useState(() => getCount(key))
  const limit = LIMITS[key] || 0
  const remaining = Math.max(0, limit - count)
  const limitReached = count >= limit

  const increment = () => {
    const next = incrementCount(key)
    setCount(next)
  }

  return { count, limit, remaining, limitReached, increment }
}