import { useState } from 'react'
import { supabase } from '../utils/supabase'

const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55–64', '65+']

const DIETARY_OPTIONS = [
  { id: 'vegan',        label: '🌱 Vegan' },
  { id: 'vegetarian',   label: '🥗 Vegetarian' },
  { id: 'pescatarian',  label: '🐟 Pescatarian' },
  { id: 'gluten_free',  label: '🌾 Gluten free' },
  { id: 'halal',        label: '☪️ Halal' },
  { id: 'kosher',       label: '✡️ Kosher' },
  { id: 'nut_allergy',  label: '🥜 Nut allergy' },
  { id: 'dairy_free',   label: '🥛 Dairy free' },
]

const ACTIVITY_LABELS = {
  1: { label: 'Very relaxed',  desc: 'Slow pace, lots of rest, minimal walking' },
  2: { label: 'Gentle',        desc: 'Light sightseeing, café stops, easy days' },
  3: { label: 'Balanced',      desc: 'Mix of activity and downtime' },
  4: { label: 'Active',        desc: 'Plenty of walking, some physical activities' },
  5: { label: 'Very active',   desc: 'Hiking, cycling, packed days' },
}

export default function ProfileSetup({ user, onComplete }) {
  const [step,          setStep]         = useState(1)
  const [ageRange,      setAgeRange]     = useState('')
  const [activityLevel, setActivityLevel]= useState(3)
  const [dietary,       setDietary]      = useState([])
  const [dietaryOther,  setDietaryOther] = useState('')
  const [extraInfo,     setExtraInfo]    = useState('')
  const [saving,        setSaving]       = useState(false)

  const toggleDiet = (id) =>
    setDietary(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').upsert({
        id:             user.id,
        age_range:      ageRange,
        activity_level: activityLevel,
        dietary:        dietary,
        dietary_other:  dietaryOther,
        extra_info:     extraInfo,
      })
      if (error) throw error
      onComplete({
        age_range:      ageRange,
        activity_level: activityLevel,
        dietary,
        dietary_other:  dietaryOther,
        extra_info:     extraInfo,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const TOTAL_STEPS = 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md" style={{background:'#111614', border:'1px solid rgba(127,182,133,0.3)', borderRadius:'1rem'}}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <h2 className="font-serif text-xl" style={{color:'#f0ede8'}}>Let's personalise Sherpa</h2>
          <p className="text-sm mt-1" style={{color:'#7a7870'}}>Just a few quick questions so we can tailor every recommendation to you.</p>
          {/* Progress */}
          <div className="flex gap-1.5 mt-4">
            {Array.from({length: TOTAL_STEPS}).map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all"
                   style={{background: i < step ? '#7fb685' : 'rgba(255,255,255,0.1)'}}/>
            ))}
          </div>
        </div>

        <div className="px-6 py-5">

          {/* Step 1 — Age range */}
          {step === 1 && (
            <div>
              <p className="font-medium mb-4" style={{color:'#c8c4bc'}}>What's your age range?</p>
              <div className="grid grid-cols-3 gap-2">
                {AGE_RANGES.map(r => (
                  <button key={r} onClick={() => setAgeRange(r)}
                    className="py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: ageRange === r ? '#7fb685' : 'rgba(255,255,255,0.05)',
                      color:      ageRange === r ? '#111614' : '#a0a098',
                      border:     ageRange === r ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Activity level */}
          {step === 2 && (
            <div>
              <p className="font-medium mb-1" style={{color:'#c8c4bc'}}>How active do you like your holidays?</p>
              <p className="text-xs mb-5" style={{color:'#7a7870'}}>This helps us pitch the right amount of activity each day</p>
              <div className="space-y-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setActivityLevel(n)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: activityLevel === n ? 'rgba(127,182,133,0.15)' : 'rgba(255,255,255,0.03)',
                      border:     activityLevel === n ? '1px solid rgba(127,182,133,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="w-2 h-5 rounded-sm"
                             style={{background: i <= n ? '#7fb685' : 'rgba(255,255,255,0.1)'}}/>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{color: activityLevel===n ? '#f0ede8' : '#a0a098'}}>{ACTIVITY_LABELS[n].label}</p>
                      <p className="text-xs" style={{color:'#7a7870'}}>{ACTIVITY_LABELS[n].desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Dietary */}
          {step === 3 && (
            <div>
              <p className="font-medium mb-1" style={{color:'#c8c4bc'}}>Any dietary requirements?</p>
              <p className="text-xs mb-4" style={{color:'#7a7870'}}>Select all that apply — skip if none</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {DIETARY_OPTIONS.map(o => (
                  <button key={o.id} onClick={() => toggleDiet(o.id)}
                    className="py-2.5 px-3 rounded-lg text-sm text-left transition-all"
                    style={{
                      background: dietary.includes(o.id) ? 'rgba(127,182,133,0.15)' : 'rgba(255,255,255,0.03)',
                      color:      dietary.includes(o.id) ? '#f0ede8' : '#a0a098',
                      border:     dietary.includes(o.id) ? '1px solid rgba(127,182,133,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    {o.label}
                  </button>
                ))}
              </div>
              <input
                className="input w-full text-sm"
                placeholder="Anything else? e.g. shellfish allergy, no pork…"
                value={dietaryOther}
                onChange={e => setDietaryOther(e.target.value)}
              />
            </div>
          )}

          {/* Step 4 — Extra info */}
          {step === 4 && (
            <div>
              <p className="font-medium mb-1" style={{color:'#c8c4bc'}}>Anything else we should know?</p>
              <p className="text-xs mb-4" style={{color:'#7a7870'}}>
                This goes straight into every recommendation. The more detail the better — mobility needs, 
                travel style, things you hate, places you've already been, bucket list items…
              </p>
              <textarea
                className="input w-full text-sm"
                rows={5}
                placeholder="e.g. I use a walking stick so prefer flat routes. I've done Barcelona twice. I love street food markets and hate touristy restaurants. I'm a huge architecture nerd…"
                value={extraInfo}
                onChange={e => setExtraInfo(e.target.value)}
                style={{resize:'none'}}
              />
              <p className="text-xs mt-2" style={{color:'#7a7870'}}>You can update this anytime from your profile.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-lg text-sm"
              style={{background:'rgba(255,255,255,0.05)', color:'#a0a098', border:'1px solid rgba(255,255,255,0.08)'}}>
              ← Back
            </button>
          )}
          <button
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{background:'#7fb685', color:'#111614'}}
            onClick={() => step < TOTAL_STEPS ? setStep(s => s + 1) : handleSave()}
            disabled={saving || (step === 1 && !ageRange)}
          >
            {saving ? 'Saving…' : step < TOTAL_STEPS ? 'Continue →' : '✓ Save my profile'}
          </button>
          {step === 1 && (
            <button onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-lg text-sm"
              style={{color:'#7a7870'}}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
