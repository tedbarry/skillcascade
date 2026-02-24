import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/* ─────────────────────────────────────────────
   SVG Icons (inline, no emoji)
   ───────────────────────────────────────────── */

const ICONS = {
  send: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M12 5l5 5-5 5" />
    </svg>
  ),
  chat: (
    <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 8h24a2 2 0 012 2v14a2 2 0 01-2 2H16l-6 5v-5H8a2 2 0 01-2-2V10a2 2 0 012-2z" />
      <path d="M13 16h14M13 20h8" />
    </svg>
  ),
  noClient: (
    <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="14" r="6" />
      <path d="M8 34c0-6 5.4-11 12-11s12 5 12 11" />
      <path d="M28 8l-16 24" />
    </svg>
  ),
  message: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h12a2 2 0 012 2v7a2 2 0 01-2 2H8l-3 3v-3H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   Quick Message Templates
   ───────────────────────────────────────────── */

const QUICK_TEMPLATES = [
  'Great progress this week!',
  'Please review the home practice activities',
  "Let's discuss {name}'s goals at our next meeting",
  'New assessment results are available',
]

/* ─────────────────────────────────────────────
   Relative Timestamp Helper
   ───────────────────────────────────────────── */

function relativeTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: days > 365 ? 'numeric' : undefined,
  })
}

/* ─────────────────────────────────────────────
   Date Divider Label Helper
   ───────────────────────────────────────────── */

function dateDividerLabel(timestamp) {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/* ─────────────────────────────────────────────
   Supabase Message Helpers
   ───────────────────────────────────────────── */

async function loadMessages(clientId) {
  if (!clientId) return []
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(display_name, role)')
    .eq('client_id', clientId)
    .order('created_at')
  if (error) { console.error('Failed to load messages:', error.message); return [] }
  return (data || []).map((m) => ({
    id: m.id,
    sender: m.sender?.display_name || 'Unknown',
    role: m.sender?.role || 'bcba',
    text: m.text,
    timestamp: new Date(m.created_at).getTime(),
    read: (m.read_by || []).length > 0,
    read_by: m.read_by || [],
    sender_id: m.sender_id,
  }))
}

/* ─────────────────────────────────────────────
   Date Grouping Helper
   ───────────────────────────────────────────── */

function groupMessagesByDate(messages) {
  const groups = []
  let currentDateKey = null

  for (const msg of messages) {
    const d = new Date(msg.timestamp)
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

    if (dateKey !== currentDateKey) {
      currentDateKey = dateKey
      groups.push({ type: 'divider', timestamp: msg.timestamp, key: `div-${dateKey}` })
    }

    groups.push({ type: 'message', data: msg, key: msg.id })
  }

  return groups
}

/* ─────────────────────────────────────────────
   Messaging Component
   ───────────────────────────────────────────── */

export default function Messaging({
  clientId,
  clientName,
}) {
  const { user, profile } = useAuth()
  const currentUser = { name: profile?.display_name || 'User', role: profile?.role || 'bcba' }
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  /* ── Load messages when clientId changes ── */

  useEffect(() => {
    if (!clientId) {
      setMessages([])
      return
    }

    loadMessages(clientId).then((loaded) => {
      // Mark unread messages as read
      const unreadIds = loaded
        .filter((msg) => msg.sender_id !== user?.id && !(msg.read_by || []).includes(user?.id))
        .map((msg) => msg.id)

      if (unreadIds.length > 0 && user) {
        // Mark as read in Supabase
        Promise.all(unreadIds.map((id) =>
          supabase.rpc('mark_message_read', { message_id: id, reader_id: user.id })
            .catch(() => {}) // best effort
        ))
      }

      setMessages(loaded)
    })
  }, [clientId, user?.id])

  /* ── Auto-scroll to bottom ── */

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  /* ── Send a message ── */

  async function handleSend() {
    const text = inputValue.trim()
    if (!text || !clientId || !user) return

    const { data, error } = await supabase
      .from('messages')
      .insert({
        client_id: clientId,
        sender_id: user.id,
        text,
      })
      .select('*, sender:profiles!sender_id(display_name, role)')
      .single()

    if (error) {
      console.error('Failed to send message:', error.message)
      return
    }

    const newMsg = {
      id: data.id,
      sender: data.sender?.display_name || currentUser.name,
      role: data.sender?.role || currentUser.role,
      text: data.text,
      timestamp: new Date(data.created_at).getTime(),
      read: false,
      read_by: [],
      sender_id: data.sender_id,
    }

    setMessages((prev) => [...prev, newMsg])
    setInputValue('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ── Unread count (messages not sent by me) ── */

  const unreadCount = messages.filter(
    (m) => m.sender_id !== user?.id && !(m.read_by || []).includes(user?.id)
  ).length

  /* ── Grouped items for rendering ── */

  const grouped = groupMessagesByDate(messages)

  /* ── Character limit ── */

  const charLimit = 500
  const charsRemaining = charLimit - inputValue.length

  /* ─────────────────────────────────────────
     No Client State
     ───────────────────────────────────────── */

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-warm-400">
        <div className="text-warm-300 mb-3">{ICONS.noClient}</div>
        <p className="text-sm font-medium">Select a client to view messages</p>
      </div>
    )
  }

  /* ─────────────────────────────────────────
     Main Render
     ───────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200 bg-warm-50">
        <div className="flex items-center gap-2.5">
          <div className="text-sage-600">{ICONS.message}</div>
          <div>
            <h3 className="font-display text-sm font-semibold text-warm-800 leading-tight">
              Messages
              {clientName && (
                <span className="font-normal text-warm-500"> — {clientName}</span>
              )}
            </h3>
            <p className="text-[11px] text-warm-400 leading-tight mt-0.5">
              Secure team messaging — synced across all your devices
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-coral-500 text-white text-[11px] font-bold leading-none">
            {unreadCount}
          </span>
        )}
      </div>

      {/* ── Message List ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-warm-300 mb-3">{ICONS.chat}</div>
            <p className="text-sm text-warm-500 max-w-[260px] leading-relaxed">
              Start a conversation about {clientName ? `${clientName}'s` : "your client's"} progress.
              Messages help keep the whole team aligned.
            </p>
          </div>
        ) : (
          grouped.map((item) => {
            if (item.type === 'divider') {
              return (
                <div key={item.key} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-warm-200" />
                  <span className="text-[11px] font-medium text-warm-400 shrink-0">
                    {dateDividerLabel(item.timestamp)}
                  </span>
                  <div className="flex-1 h-px bg-warm-200" />
                </div>
              )
            }

            const msg = item.data
            const isSelf = msg.sender_id === user?.id
            const isBcba = msg.role === 'bcba'

            return (
              <div
                key={item.key}
                className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-1.5`}
              >
                <div className={`max-w-[75%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Sender name */}
                  <span
                    className={`text-[11px] font-medium mb-0.5 px-1 ${
                      isBcba ? 'text-sage-600' : 'text-warm-600'
                    }`}
                  >
                    {msg.sender}
                  </span>

                  {/* Bubble */}
                  <div
                    className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      isBcba
                        ? 'bg-sage-100 text-sage-900 rounded-tr-sm'
                        : 'bg-warm-100 text-warm-900 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Timestamp */}
                  <span
                    className={`text-[10px] text-warm-400 mt-0.5 px-1 ${
                      isSelf ? 'text-right' : 'text-left'
                    }`}
                  >
                    {relativeTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Quick Templates ── */}
      <div className="px-4 pt-2 pb-1 border-t border-warm-100">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_TEMPLATES.map((template) => {
            const displayText = template.replace('{name}', clientName || 'the client')
            return (
              <button
                key={template}
                type="button"
                onClick={() => setInputValue(displayText)}
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium
                           bg-warm-50 text-warm-600 border border-warm-200
                           hover:bg-sage-50 hover:text-sage-700 hover:border-sage-300
                           transition-colors whitespace-nowrap"
              >
                {displayText}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Input Area ── */}
      <div className="px-4 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                if (e.target.value.length <= charLimit) {
                  setInputValue(e.target.value)
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              maxLength={charLimit}
              className="w-full px-3 py-2 pr-14 rounded-lg border border-warm-200 bg-white
                         text-sm text-warm-800 placeholder:text-warm-300
                         focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300
                         transition-colors"
            />
            {/* Character count */}
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${
                charsRemaining < 50 ? 'text-coral-500' : 'text-warm-300'
              }`}
            >
              {charsRemaining}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-lg
                       bg-sage-600 text-white shadow-sm
                       hover:bg-sage-700 active:bg-sage-800
                       disabled:bg-warm-200 disabled:text-warm-400 disabled:shadow-none
                       transition-colors"
            aria-label="Send message"
          >
            {ICONS.send}
          </button>
        </div>
      </div>
    </div>
  )
}
