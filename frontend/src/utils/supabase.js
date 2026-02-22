import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://csskviadplwocboidnmr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Ob9rIkJal8VkzIi3Uj6WmQ_iIwm4TgP'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Auth helpers ──────────────────────────────────────────────
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Trip helpers ──────────────────────────────────────────────
export async function saveTrip({ destination, country, emoji, itinerary, flightDetails, carHire, hotel, prefs }) {
  const user = await getUser()
  if (!user) throw new Error('Not logged in')

  const { data, error } = await supabase
    .from('trips')
    .insert({
      user_id:        user.id,
      destination,
      country,
      emoji,
      itinerary,
      flight_details: flightDetails,
      car_hire:       carHire,
      hotel,
      prefs,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateTrip(id, updates) {
  const { data, error } = await supabase
    .from('trips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function deleteTrip(id) {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Profile helpers ───────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function saveProfile(userId, profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
