import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSending(true)

    try {
      // Store contact submission in Supabase
      const { error: dbError } = await supabase
        .from('contact_submissions')
        .insert({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        })

      if (dbError) {
        // Table might not exist yet — fall back to mailto
        window.location.href = `mailto:support@skillcascade.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`From: ${name} (${email})\n\n${message}`)}`
        return
      }

      setSent(true)
    } catch {
      setError('Failed to send message. Please email us directly at support@skillcascade.com')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-sage-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-warm-800 font-display mb-2">Message Sent</h2>
            <p className="text-sm text-warm-500 mb-6">
              Thank you for reaching out. We'll get back to you within 1-2 business days.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-2.5 rounded-lg bg-sage-500 text-white text-sm font-semibold hover:bg-sage-600 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="bg-white border-b border-warm-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link to="/" className="text-lg font-bold text-warm-800 font-display">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-warm-900 font-display mb-2">Contact Us</h1>
        <p className="text-sm text-warm-500 mb-8">
          Have a question, need support, or want to learn more? We'd love to hear from you.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-warm-200 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-medium text-warm-600 mb-1">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 min-h-[44px]"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-xs font-medium text-warm-600 mb-1">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 min-h-[44px]"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-subject" className="block text-xs font-medium text-warm-600 mb-1">
              Subject
            </label>
            <select
              id="contact-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 min-h-[44px]"
            >
              <option value="">Select a topic...</option>
              <option value="General Inquiry">General Inquiry</option>
              <option value="Product Demo">Product Demo</option>
              <option value="Technical Support">Technical Support</option>
              <option value="Billing">Billing</option>
              <option value="HIPAA / Compliance">HIPAA / Compliance</option>
              <option value="Partnership">Partnership</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Bug Report">Bug Report</option>
            </select>
          </div>

          <div>
            <label htmlFor="contact-message" className="block text-xs font-medium text-warm-600 mb-1">
              Message
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-y"
              placeholder="How can we help?"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-2.5 rounded-lg bg-sage-500 text-white text-sm font-semibold hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-warm-500">
          <p>Or email us directly at <a href="mailto:support@skillcascade.com" className="text-sage-600 hover:text-sage-700 font-medium">support@skillcascade.com</a></p>
        </div>

        <div className="mt-4">
          <Link to="/" className="text-sm text-sage-600 hover:text-sage-700 font-medium">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
