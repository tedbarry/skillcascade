import { Link } from 'react-router-dom'
import CascadeAnimation from '../components/CascadeAnimation.jsx'

export default function Landing() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold text-warm-800 font-display">
          Skill<span className="text-sage-500">Cascade</span>
        </div>
        <div className="flex gap-6 items-center">
          <a href="#framework" className="text-warm-600 hover:text-warm-800 transition-colors">Framework</a>
          <a href="#demo" className="text-warm-600 hover:text-warm-800 transition-colors">Demo</a>
          <a href="#pricing" className="text-warm-600 hover:text-warm-800 transition-colors">Pricing</a>
          <Link
            to="/dashboard"
            className="bg-sage-500 text-white px-5 py-2.5 rounded-lg hover:bg-sage-600 transition-colors font-medium"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 py-24 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-warm-900 font-display leading-tight mb-6">
          See the skills beneath<br />the behavior
        </h1>
        <p className="text-xl text-warm-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          SkillCascade maps 300+ developmental-functional skills across 9 domains,
          revealing why foundational gaps cascade into higher-level breakdowns.
          Visualize, assess, and track — so you can intervene where it matters most.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/dashboard"
            className="bg-sage-500 text-white px-8 py-3.5 rounded-lg hover:bg-sage-600 transition-colors text-lg font-medium"
          >
            Try the Demo
          </Link>
          <a
            href="#framework"
            className="border-2 border-warm-300 text-warm-700 px-8 py-3.5 rounded-lg hover:border-warm-400 transition-colors text-lg font-medium"
          >
            Learn the Framework
          </a>
        </div>
      </section>

      {/* Domain preview */}
      <section id="framework" className="max-w-7xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-warm-800 font-display text-center mb-4">
          9 Domains, One Cascading System
        </h2>
        <p className="text-warm-600 text-center max-w-2xl mx-auto mb-12">
          Each domain builds on the ones below it. When foundational skills are unstable,
          everything above becomes unreliable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { num: 1, name: 'Regulation', desc: 'Body, Emotion, Arousal', color: 'bg-coral-100 border-coral-300' },
            { num: 2, name: 'Self-Awareness', desc: 'Insight & Understanding', color: 'bg-coral-50 border-coral-200' },
            { num: 3, name: 'Executive Function', desc: 'Start, Sustain, Shift, Finish', color: 'bg-warm-100 border-warm-300' },
            { num: 4, name: 'Problem Solving', desc: 'Judgment & Strategy', color: 'bg-warm-100 border-warm-200' },
            { num: 5, name: 'Communication', desc: 'Functional & Social', color: 'bg-warm-50 border-warm-200' },
            { num: 6, name: 'Social Understanding', desc: 'Perspective & Norms', color: 'bg-sage-50 border-sage-200' },
            { num: 7, name: 'Identity', desc: 'Self-Concept & Resilience', color: 'bg-sage-100 border-sage-200' },
            { num: 8, name: 'Safety & Survival', desc: 'Override Skills', color: 'bg-sage-100 border-sage-300' },
            { num: 9, name: 'Support System', desc: 'Caregiver & Environment', color: 'bg-sage-200 border-sage-300' },
          ].map((d) => (
            <div key={d.num} className={`${d.color} border rounded-xl p-5 transition-transform hover:scale-[1.02]`}>
              <div className="text-sm font-medium text-warm-500 mb-1">Domain {d.num}</div>
              <div className="text-lg font-bold text-warm-800">{d.name}</div>
              <div className="text-sm text-warm-600">{d.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cascade demo */}
      <section id="demo" className="max-w-7xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-warm-800 font-display text-center mb-4">
          See Why Foundations Matter
        </h2>
        <p className="text-warm-600 text-center max-w-2xl mx-auto mb-8">
          Click any domain to weaken it and watch the impact cascade upward.
          This is why effective intervention starts at the bottom.
        </p>
        <div className="bg-[#1a1a1e] rounded-2xl p-6 max-w-2xl mx-auto">
          <CascadeAnimation compact />
        </div>
      </section>

      {/* Pricing placeholder */}
      <section id="pricing" className="max-w-7xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-warm-800 font-display text-center mb-4">
          Pricing
        </h2>
        <p className="text-warm-600 text-center max-w-xl mx-auto mb-12">
          Plans for clinical practices, schools, coaching firms, and corporate training programs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { name: 'Starter', price: 'Free', features: ['1 clinician', '5 client profiles', 'All visualizations', 'Local storage'] },
            { name: 'Professional', price: '$49/mo', features: ['5 clinicians', 'Unlimited profiles', 'Cloud sync', 'PDF reports', 'Priority support'] },
            { name: 'Organization', price: 'Custom', features: ['Unlimited clinicians', 'Team dashboard', 'API access', 'SSO/SAML', 'Dedicated support'] },
          ].map((tier) => (
            <div key={tier.name} className="bg-white border border-warm-200 rounded-xl p-6 text-center">
              <h3 className="text-lg font-bold text-warm-800 mb-1">{tier.name}</h3>
              <div className="text-3xl font-bold text-sage-600 mb-4">{tier.price}</div>
              <ul className="text-warm-600 text-sm space-y-2">
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-200 mt-20 py-8 text-center text-warm-500 text-sm">
        &copy; {new Date().getFullYear()} SkillCascade. All rights reserved.
      </footer>
    </div>
  )
}
