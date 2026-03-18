import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const RANGES = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export default function useAnalyticsData(range = '30d') {
  const [sessions, setSessions] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const days = RANGES[range] || 30

  // Memoize date strings to prevent infinite re-render loops
  const currentStart = useMemo(() => daysAgo(days), [days])
  const previousStart = useMemo(() => daysAgo(days * 2), [days])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sessResult, evtResult] = await Promise.all([
        supabase
          .from('usage_sessions')
          .select('*')
          .gte('started_at', previousStart)
          .order('started_at', { ascending: false }),
        supabase
          .from('usage_events')
          .select('*')
          .gte('created_at', previousStart)
          .order('created_at', { ascending: false }),
      ])

      if (sessResult.error) throw sessResult.error
      if (evtResult.error) throw evtResult.error

      setSessions(sessResult.data || [])
      setEvents(evtResult.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [previousStart])

  useEffect(() => { fetchData() }, [fetchData])

  // Split sessions/events into current and previous periods
  const currentSessions = useMemo(
    () => sessions.filter((s) => s.started_at >= currentStart),
    [sessions, currentStart]
  )
  const previousSessions = useMemo(
    () => sessions.filter((s) => s.started_at < currentStart),
    [sessions, currentStart]
  )
  const currentEvents = useMemo(
    () => events.filter((e) => e.created_at >= currentStart),
    [events, currentStart]
  )
  const previousEvents = useMemo(
    () => events.filter((e) => e.created_at < currentStart),
    [events, currentStart]
  )

  // ── Overview KPIs ──
  const overview = useMemo(() => {
    const uniqueUsers = (sess) => new Set(sess.map((s) => s.user_id)).size
    const avgDuration = (sess) => {
      const durations = sess.filter((s) => s.duration_seconds > 0)
      return durations.length ? Math.round(durations.reduce((a, s) => a + s.duration_seconds, 0) / durations.length) : 0
    }
    const eventsPerSession = (sess, evts) =>
      sess.length ? Math.round((evts.length / sess.length) * 10) / 10 : 0

    const cur = {
      activeUsers: uniqueUsers(currentSessions),
      sessions: currentSessions.length,
      avgDuration: avgDuration(currentSessions),
      eventsPerSession: eventsPerSession(currentSessions, currentEvents),
    }
    const prev = {
      activeUsers: uniqueUsers(previousSessions),
      sessions: previousSessions.length,
      avgDuration: avgDuration(previousSessions),
      eventsPerSession: eventsPerSession(previousSessions, previousEvents),
    }

    return { current: cur, previous: prev }
  }, [currentSessions, previousSessions, currentEvents, previousEvents])

  // ── Sessions over time (daily) ──
  const dailySessions = useMemo(() => {
    const counts = {}
    for (const s of currentSessions) {
      const day = s.started_at.slice(0, 10)
      counts[day] = (counts[day] || 0) + 1
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, sessions: count }))
  }, [currentSessions])

  // ── Top views ──
  const topViews = useMemo(() => {
    const counts = {}
    for (const e of currentEvents) {
      if (e.event_type === 'view_open') {
        counts[e.event_name] = (counts[e.event_name] || 0) + 1
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }))
  }, [currentEvents])

  // ── Top features ──
  const topFeatures = useMemo(() => {
    const counts = {}
    for (const e of currentEvents) {
      if (e.event_type === 'feature_use') {
        counts[e.event_name] = (counts[e.event_name] || 0) + 1
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }))
  }, [currentEvents])

  // ── Feature detail table ──
  const featureDetails = useMemo(() => {
    const map = {}
    for (const e of currentEvents) {
      if (e.event_type !== 'feature_use') continue
      if (!map[e.event_name]) map[e.event_name] = { name: e.event_name, count: 0, users: new Set() }
      map[e.event_name].count++
      map[e.event_name].users.add(e.user_id)
    }
    return Object.values(map)
      .map((f) => ({ name: f.name, count: f.count, uniqueUsers: f.users.size, avgPerUser: Math.round((f.count / f.users.size) * 10) / 10 }))
      .sort((a, b) => b.count - a.count)
  }, [currentEvents])

  // ── User activity table ──
  const userActivity = useMemo(() => {
    const map = {}
    for (const s of currentSessions) {
      if (!map[s.user_id]) {
        map[s.user_id] = {
          userId: s.user_id,
          role: s.role,
          org_id: s.org_id,
          plan: s.plan,
          sessions: 0,
          totalDuration: 0,
          lastActive: s.started_at,
          topView: null,
          totalEvents: 0,
        }
      }
      map[s.user_id].sessions++
      map[s.user_id].totalDuration += s.duration_seconds || 0
      if (s.started_at > map[s.user_id].lastActive) map[s.user_id].lastActive = s.started_at
    }

    // Count events and find top view per user
    const viewCounts = {}
    for (const e of currentEvents) {
      const uid = e.user_id
      if (!map[uid]) continue
      map[uid].totalEvents++
      if (e.event_type === 'view_open') {
        const key = `${uid}:${e.event_name}`
        viewCounts[key] = (viewCounts[key] || 0) + 1
      }
    }

    for (const u of Object.values(map)) {
      let maxView = null
      let maxCount = 0
      for (const [key, count] of Object.entries(viewCounts)) {
        if (key.startsWith(u.userId + ':') && count > maxCount) {
          maxCount = count
          maxView = key.split(':')[1]
        }
      }
      u.topView = maxView
    }

    return Object.values(map).sort((a, b) => b.sessions - a.sessions)
  }, [currentSessions, currentEvents])

  // ── Role breakdown ──
  const roleBreakdown = useMemo(() => {
    const counts = {}
    for (const s of currentSessions) {
      const role = s.role || 'unknown'
      counts[role] = (counts[role] || 0) + 1
    }
    return Object.entries(counts).map(([role, count]) => ({ name: role, value: count }))
  }, [currentSessions])

  // ── Plan breakdown ──
  const planBreakdown = useMemo(() => {
    const counts = {}
    for (const s of currentSessions) {
      const plan = s.plan || 'free'
      counts[plan] = (counts[plan] || 0) + 1
    }
    return Object.entries(counts).map(([plan, count]) => ({ name: plan, value: count }))
  }, [currentSessions])

  // ── Device breakdown ──
  const deviceBreakdown = useMemo(() => {
    const counts = {}
    for (const s of currentSessions) {
      const device = s.device_type || 'unknown'
      counts[device] = (counts[device] || 0) + 1
    }
    return Object.entries(counts).map(([device, count]) => ({ name: device, value: count }))
  }, [currentSessions])

  // ── Errors ──
  const errors = useMemo(() => {
    const map = {}
    for (const e of currentEvents) {
      if (e.event_type !== 'error') continue
      const key = `${e.event_name}:${e.metadata?.message || 'unknown'}`
      if (!map[key]) map[key] = { name: e.event_name, message: e.metadata?.message || '', count: 0, lastSeen: e.created_at }
      map[key].count++
      if (e.created_at > map[key].lastSeen) map[key].lastSeen = e.created_at
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [currentEvents])

  // ── Onboarding funnel ──
  const onboardingFunnel = useMemo(() => {
    const steps = { tour_start: 0, tour_complete: 0, tour_skip: 0 }
    for (const e of currentEvents) {
      if (e.event_type === 'onboarding' && steps[e.event_name] !== undefined) {
        steps[e.event_name]++
      }
    }
    return Object.entries(steps).map(([step, count]) => ({ step, count }))
  }, [currentEvents])

  // ── Session duration distribution ──
  const durationDistribution = useMemo(() => {
    const buckets = { '<1m': 0, '1-5m': 0, '5-15m': 0, '15-30m': 0, '30m+': 0 }
    for (const s of currentSessions) {
      const d = s.duration_seconds || 0
      if (d < 60) buckets['<1m']++
      else if (d < 300) buckets['1-5m']++
      else if (d < 900) buckets['5-15m']++
      else if (d < 1800) buckets['15-30m']++
      else buckets['30m+']++
    }
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }))
  }, [currentSessions])

  return {
    loading,
    error,
    refresh: fetchData,
    overview,
    dailySessions,
    topViews,
    topFeatures,
    featureDetails,
    userActivity,
    roleBreakdown,
    planBreakdown,
    deviceBreakdown,
    errors,
    onboardingFunnel,
    durationDistribution,
  }
}
