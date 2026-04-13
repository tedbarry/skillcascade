import { useState, useEffect, useCallback } from 'react'
import { mergeUserSettings } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export const CRITERIA_PRESETS = [
  { label: '80% across 3 consecutive sessions', value: '80% accuracy across 3 consecutive sessions' },
  { label: '80% across 5 consecutive sessions', value: '80% accuracy across 5 consecutive sessions' },
  { label: '90% across 3 consecutive sessions', value: '90% accuracy across 3 consecutive sessions' },
  { label: '90% across 5 consecutive sessions', value: '90% accuracy across 5 consecutive sessions' },
  { label: '3 consecutive sessions at mastery', value: '3 consecutive sessions at mastery criterion' },
  { label: '4 out of 5 opportunities', value: 'independently in 4 out of 5 opportunities' },
]

export const DEFAULT_GOAL_PREFS = {
  masteryCriteria: '80% accuracy across 3 consecutive sessions',
  includeCriteria: true,    // whether to append criteria to goal text
  includeCondition: true,   // whether to include "Given..." condition prefix
  goalFormat: 'full',       // 'full' = condition + behavior + criteria, 'behavior-only' = just the behavior
}

export default function useGoalPreferences() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(DEFAULT_GOAL_PREFS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) { setLoaded(true); return }

    api
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.settings?.goal_preferences) {
          setPrefs(prev => ({ ...prev, ...data.settings.goal_preferences }))
        }
        setLoaded(true)
      })
  }, [user])

  const updatePrefs = useCallback(async (partial) => {
    const updated = { ...prefs, ...partial }
    setPrefs(updated)
    if (user) {
      await mergeUserSettings(user.id, { goal_preferences: updated })
    }
  }, [prefs, user])

  return { goalPrefs: prefs, updateGoalPrefs: updatePrefs, loaded }
}
