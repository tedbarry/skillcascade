import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { buildChatContext } from '../lib/chatContext.js'
import useResponsive from '../hooks/useResponsive.js'

/* ─────────────────────────────────────────────
   Inline SVG Icons
   ───────────────────────────────────────────── */

const ChatIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

/* ─────────────────────────────────────────────
   Typing Indicator
   ───────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="w-2 h-2 rounded-full bg-warm-300 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-warm-300 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-warm-300 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   SupportChat Component
   ───────────────────────────────────────────── */

export default function SupportChat({ activeView, clientName, assessments, plan, role }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the SkillCascade Guide. I can help you navigate the app, understand visualizations, or explain how the assessment works. What can I help with?' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { isPhone } = useResponsive()

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to let animation finish
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    setHasBeenOpened(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setError(null)
    const userMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const context = buildChatContext({ activeView, clientName, assessments, plan, role })

      // Build message history (keep last 20 messages to stay within token limits)
      const history = [...messages, userMessage]
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }))

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/support-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: history, context }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, activeView, clientName, assessments, plan, role])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Dismiss with Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  // Bottom offset for mobile tab bar
  const bottomOffset = isPhone ? 'bottom-20' : 'bottom-5'
  const bubbleBottom = isPhone ? 'bottom-20' : 'bottom-5'

  return (
    <>
      {/* Floating chat bubble */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed ${bubbleBottom} right-5 z-[900] w-14 h-14 rounded-full bg-sage-500 hover:bg-sage-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center min-h-[44px] ${
            !hasBeenOpened ? 'animate-pulse' : ''
          }`}
          aria-label="Open support chat"
          title="SkillCascade Guide"
        >
          <ChatIcon />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className={`fixed ${bottomOffset} right-0 z-[900] flex flex-col bg-white border border-warm-200 shadow-2xl transition-all duration-300 ease-out ${
            isPhone
              ? 'inset-x-0 top-0 rounded-none'
              : 'right-5 w-[350px] h-[500px] rounded-xl'
          }`}
          style={{
            animation: 'supportChatSlideUp 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-sage-500 text-white rounded-t-xl shrink-0">
            <div className="flex items-center gap-2">
              <ChatIcon />
              <span className="font-semibold text-sm">SkillCascade Guide</span>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-md hover:bg-sage-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close chat"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-sage-100 text-warm-800 rounded-br-sm'
                      : 'bg-warm-50 text-warm-700 border border-warm-100 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-warm-50 border border-warm-100 rounded-lg rounded-bl-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="px-3 py-2 rounded-lg text-xs text-red-600 bg-red-50 border border-red-200">
                  {error}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-warm-200 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-warm-200 bg-warm-50 text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 disabled:opacity-50 min-h-[44px]"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-3 py-2 rounded-lg bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animation */}
      <style>{`
        @keyframes supportChatSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
