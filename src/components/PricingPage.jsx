import { useState } from 'react'
import { Link } from 'react-router-dom'
import useResponsive from '../hooks/useResponsive'

/* ── Inline SVG Icons ─────────────────────────────────────── */

function CheckIcon({ className = '' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 9.5L7.5 13L14 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShieldIcon({ className = '' }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 12.5L10.8 14.8L15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon({ className = '' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XMarkIcon({ className = '' }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ExportIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12M12 3l4 4M12 3L8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ClipboardIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 2h6v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CalendarIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function HandshakeIcon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 14l5-5 4 2 5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 19l3-3 4 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Pricing Data ─────────────────────────────────────────── */

const TIERS = [
  {
    name: 'Starter',
    monthlyPrice: 49,
    description: 'For individual BCBAs or small practices',
    clients: 'Up to 25 clients',
    seats: '1 BCBA seat',
    cta: 'Start Free Trial',
    features: [
      'All assessment tools (full framework, adaptive assessment)',
      'All visualizations (sunburst, radar, skill tree, cascade, timeline)',
      'Goal engine',
      'Pattern alerts',
      'Report generator (all 3 types)',
      'Progress prediction',
      'Data export (CSV, JSON, HTML reports)',
      'Dark mode & accessibility',
      'HIPAA-compliant data storage',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    monthlyPrice: 149,
    description: 'For growing practices',
    clients: 'Up to 100 clients',
    seats: '5 BCBA seats',
    popular: true,
    cta: 'Start Free Trial',
    features: [
      'Everything in Starter, plus:',
      'AI Assistant (8 specialized tools)',
      'Caseload dashboard',
      'Org analytics',
      'Parent portal access',
      'Home practice module',
      'Messaging (BCBA-parent)',
      'Milestone celebrations',
      'White-label branding (basic)',
      'Priority support',
      'Data backup & restore',
    ],
  },
  {
    name: 'Enterprise',
    monthlyPrice: 399,
    description: 'For therapy companies & multi-location orgs',
    clients: 'Unlimited clients',
    seats: 'Unlimited BCBA seats',
    cta: 'Contact Sales',
    features: [
      'Everything in Professional, plus:',
      'Multi-location support',
      'Full white-label branding (custom domain)',
      'Custom assessments & skill libraries',
      'Marketplace access',
      'API access for integrations',
      'Central Reach / Raven / Passage integration',
      'Outcome certification',
      'Dedicated account manager',
      'Custom onboarding',
      'SLA guarantee',
    ],
  },
]

const ALL_PLANS_FEATURES = [
  { icon: ShieldIcon, label: 'HIPAA-compliant storage' },
  { icon: LockIcon, label: 'Encryption at rest & in transit' },
  { icon: ClipboardIcon, label: 'Audit logging' },
  { icon: ExportIcon, label: 'Data portability' },
  { icon: CalendarIcon, label: '14-day free trial' },
  { icon: HandshakeIcon, label: 'No long-term contracts' },
]

const FAQ_ITEMS = [
  {
    question: 'Is my data HIPAA-compliant on all plans?',
    answer:
      'Yes. Every plan includes HIPAA-compliant data storage, encryption at rest and in transit, and audit logging. HIPAA compliance is not an add-on or enterprise-only feature \u2014 it is built into the foundation of SkillCascade from day one. We sign BAAs with all customers regardless of plan tier.',
  },
  {
    question: 'Can I switch plans?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to new features and we prorate the difference. When downgrading, the change takes effect at the start of your next billing cycle.',
  },
  {
    question: 'What happens after the free trial?',
    answer:
      "You'll be prompted to choose a plan and enter payment details. If you don't choose a plan, your account will be paused (not deleted) and your data will be retained for 90 days so you can pick up where you left off.",
  },
  {
    question: 'Do you offer discounts for nonprofits?',
    answer:
      'Yes, we offer special pricing for registered nonprofit organizations, university-affiliated clinics, and publicly funded therapy programs. Contact our sales team with proof of nonprofit status for details.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes, there are no long-term contracts. You can cancel your subscription at any time and retain access through the end of your current billing period. Your data remains exportable for 90 days after cancellation.',
  },
]

/* ── Subcomponents ────────────────────────────────────────── */

function BillingToggle({ isAnnual, onChange }) {
  return (
    <div className="mt-8 flex justify-center">
      <div
        className="inline-flex rounded-full bg-warm-100 p-1"
        role="radiogroup"
        aria-label="Billing period"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!isAnnual}
          onClick={() => onChange(false)}
          className={`min-h-[44px] rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2 ${
            !isAnnual
              ? 'bg-white text-warm-900 shadow-sm'
              : 'bg-transparent text-warm-500 hover:text-warm-700'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isAnnual}
          onClick={() => onChange(true)}
          className={`min-h-[44px] rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2 ${
            isAnnual
              ? 'bg-white text-warm-900 shadow-sm'
              : 'bg-transparent text-warm-500 hover:text-warm-700'
          }`}
        >
          Annual{' '}
          <span
            className={`inline-block transition-colors duration-200 ${
              isAnnual ? 'text-sage-600' : 'text-warm-400'
            }`}
          >
            (Save 20%)
          </span>
        </button>
      </div>
    </div>
  )
}

function PricingCard({ tier, isAnnual }) {
  const annualMonthly = Math.round(tier.monthlyPrice * 0.8)
  const displayPrice = isAnnual ? annualMonthly : tier.monthlyPrice

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white border transition-shadow duration-200 hover:shadow-xl ${
        tier.popular
          ? 'border-sage-400 border-2 shadow-lg'
          : 'border-warm-200 shadow-md'
      }`}
    >
      {/* Popular badge */}
      {tier.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-sage-500 px-4 py-1 text-xs font-bold tracking-wide text-white uppercase">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-7 pb-0">
        {/* Tier name */}
        <h3 className="font-display text-lg font-bold text-warm-800">
          {tier.name}
        </h3>

        {/* Description */}
        <p className="mt-1 text-sm text-warm-500">{tier.description}</p>

        {/* Price */}
        <div className="mt-5 flex items-baseline gap-1.5">
          {isAnnual && (
            <span className="text-lg text-warm-400 line-through" aria-label={`Was $${tier.monthlyPrice} per month`}>
              ${tier.monthlyPrice}
            </span>
          )}
          <span className="font-display text-4xl font-extrabold text-warm-900">
            ${displayPrice}
          </span>
          <span className="text-sm text-warm-500">/month</span>
        </div>
        {isAnnual && (
          <p className="mt-1 text-xs text-sage-600">
            Billed annually (${displayPrice * 12}/year)
          </p>
        )}

        {/* Capacity */}
        <div className="mt-4 flex flex-col gap-1 text-sm font-medium text-warm-700">
          <span>{tier.clients}</span>
          <span>{tier.seats}</span>
        </div>

        {/* CTA */}
        <Link
          to={`/signup?plan=${tier.name.toLowerCase()}`}
          className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 block text-center ${
            tier.popular
              ? 'bg-sage-500 text-white hover:bg-sage-600 focus-visible:ring-sage-500'
              : tier.name === 'Enterprise'
                ? 'bg-warm-800 text-white hover:bg-warm-900 focus-visible:ring-warm-700'
                : 'bg-warm-100 text-warm-800 hover:bg-warm-200 focus-visible:ring-warm-400'
          }`}
        >
          {tier.cta}
        </Link>
        {tier.cta !== 'Contact Sales' && (
          <p className="mt-2 text-center text-xs text-warm-400">
            14-day free trial. No credit card required.
          </p>
        )}
      </div>

      {/* Features */}
      <div className="mt-4 border-t border-warm-100 px-7 py-6 flex-1">
        <ul className="space-y-3" role="list">
          {tier.features.map((feature) => {
            const isHeader = feature.endsWith(':')
            return (
              <li
                key={feature}
                className={`flex items-start gap-2.5 text-sm ${
                  isHeader ? 'font-semibold text-warm-700 mt-1' : 'text-warm-600'
                }`}
              >
                {!isHeader && (
                  <CheckIcon className="mt-0.5 shrink-0 text-sage-500" />
                )}
                <span>{feature}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ── Feature Comparison Data ──────────────────────────────── */

const COMPARISON_FEATURES = [
  { category: 'Capacity' },
  { feature: 'Client limit', starter: 'Up to 25', professional: 'Up to 100', enterprise: 'Unlimited' },
  { feature: 'BCBA seats', starter: '1', professional: '5', enterprise: 'Unlimited' },
  { feature: 'Multi-location support', starter: false, professional: false, enterprise: true },
  { category: 'Assessment & Visualization' },
  { feature: 'Full assessment framework', starter: true, professional: true, enterprise: true },
  { feature: 'Adaptive (short) assessment', starter: true, professional: true, enterprise: true },
  { feature: 'All visualizations', starter: true, professional: true, enterprise: true },
  { feature: 'Custom assessments & skill libraries', starter: false, professional: false, enterprise: true },
  { category: 'Clinical Tools' },
  { feature: 'Goal engine', starter: true, professional: true, enterprise: true },
  { feature: 'Pattern alerts', starter: true, professional: true, enterprise: true },
  { feature: 'Progress prediction', starter: true, professional: true, enterprise: true },
  { feature: 'AI Assistant (8 tools)', starter: false, professional: true, enterprise: true },
  { feature: 'Caseload dashboard', starter: false, professional: true, enterprise: true },
  { feature: 'Org analytics', starter: false, professional: true, enterprise: true },
  { category: 'Reports & Export' },
  { feature: 'Report generator (3 types)', starter: true, professional: true, enterprise: true },
  { feature: 'Data export (CSV, JSON, HTML)', starter: true, professional: true, enterprise: true },
  { feature: 'API access for integrations', starter: false, professional: false, enterprise: true },
  { feature: 'Central Reach / Raven / Passage', starter: false, professional: false, enterprise: true },
  { category: 'Collaboration & Branding' },
  { feature: 'Parent portal access', starter: false, professional: true, enterprise: true },
  { feature: 'Home practice module', starter: false, professional: true, enterprise: true },
  { feature: 'Messaging (BCBA-parent)', starter: false, professional: true, enterprise: true },
  { feature: 'White-label branding', starter: false, professional: 'Basic', enterprise: 'Full (custom domain)' },
  { feature: 'Marketplace access', starter: false, professional: false, enterprise: true },
  { category: 'Security & Support' },
  { feature: 'HIPAA-compliant storage', starter: true, professional: true, enterprise: true },
  { feature: 'Encryption at rest & in transit', starter: true, professional: true, enterprise: true },
  { feature: 'SSO / SAML', starter: false, professional: false, enterprise: true },
  { feature: 'Data backup & restore', starter: false, professional: true, enterprise: true },
  { feature: 'Outcome certification', starter: false, professional: false, enterprise: true },
  { feature: 'Support level', starter: 'Email', professional: 'Priority', enterprise: 'Dedicated account manager' },
  { feature: 'SLA guarantee', starter: false, professional: false, enterprise: true },
  { feature: 'Custom onboarding', starter: false, professional: false, enterprise: true },
]

function ComparisonCell({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-sage-500" aria-label="Included">
        <CheckIcon />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-warm-300" aria-label="Not included">
        <XMarkIcon />
      </span>
    )
  }
  return <span className="text-sm text-warm-700 font-medium">{value}</span>
}

function FeatureComparisonTable({ isAnnual }) {
  const { isPhone } = useResponsive()
  const [isOpen, setIsOpen] = useState(false)

  // On desktop always show, on phone collapsible
  const showTable = !isPhone || isOpen

  return (
    <section className="mt-16" aria-labelledby="comparison-heading">
      {/* Toggle button — only visible on phone */}
      {isPhone && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="mx-auto flex min-h-[44px] items-center gap-2 rounded-lg border border-warm-200 bg-white px-5 py-3 text-sm font-semibold text-warm-700 shadow-sm transition-colors hover:bg-warm-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2"
        >
          Compare all features
          <ChevronDownIcon
            className={`text-warm-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}

      {showTable && (
        <div className={isPhone ? 'mt-4' : ''}>
          <h2
            id="comparison-heading"
            className="font-display text-2xl font-bold text-warm-900 text-center sm:text-3xl mb-8"
          >
            Feature comparison
          </h2>

          {/* Horizontal scroll wrapper for phone */}
          <div className={isPhone ? '-mx-4 overflow-x-auto px-4 pb-4' : ''}>
            <table
              className={`w-full border-collapse text-left ${
                isPhone ? 'min-w-[600px]' : ''
              }`}
              role="table"
            >
              <thead>
                <tr className="border-b-2 border-warm-200">
                  <th className="py-3 pr-4 text-sm font-medium text-warm-500 w-[40%]" scope="col">
                    Feature
                  </th>
                  {TIERS.map((tier) => {
                    const price = isAnnual
                      ? Math.round(tier.monthlyPrice * 0.8)
                      : tier.monthlyPrice
                    return (
                      <th
                        key={tier.name}
                        className={`py-3 px-3 text-center text-sm font-bold w-[20%] ${
                          tier.popular ? 'text-sage-700' : 'text-warm-800'
                        }`}
                        scope="col"
                      >
                        <div>{tier.name}</div>
                        <div className="mt-0.5 text-xs font-medium text-warm-400">
                          ${price}/mo
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((row, i) => {
                  if (row.category) {
                    return (
                      <tr key={row.category}>
                        <td
                          colSpan={4}
                          className="pt-6 pb-2 text-xs font-bold text-warm-500 uppercase tracking-wider"
                        >
                          {row.category}
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr
                      key={row.feature}
                      className={`border-b border-warm-100 ${
                        i % 2 === 0 ? 'bg-warm-50/50' : ''
                      }`}
                    >
                      <td className="py-3 pr-4 text-sm text-warm-700">
                        {row.feature}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <ComparisonCell value={row.starter} />
                      </td>
                      <td className={`py-3 px-3 text-center ${TIERS[1].popular ? 'bg-sage-50/40' : ''}`}>
                        <ComparisonCell value={row.professional} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <ComparisonCell value={row.enterprise} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

function AllPlansSection() {
  return (
    <section className="mt-20 text-center" aria-labelledby="all-plans-heading">
      <div className="inline-flex items-center gap-2 rounded-full bg-sage-50 px-4 py-1.5 text-xs font-semibold text-sage-700 uppercase tracking-wider mb-4">
        <ShieldIcon className="text-sage-500 w-4 h-4" />
        Every plan
      </div>
      <h2
        id="all-plans-heading"
        className="font-display text-2xl font-bold text-warm-900 sm:text-3xl"
      >
        All plans include
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-warm-500 text-sm">
        Security and compliance are not premium features. Every SkillCascade plan
        is built on the same HIPAA-compliant infrastructure.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
        {ALL_PLANS_FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl bg-white border border-warm-100 px-5 py-4 shadow-sm text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-600">
              <Icon />
            </span>
            <span className="text-sm font-medium text-warm-800">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b border-warm-100">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2 rounded"
      >
        <span className="text-sm font-semibold text-warm-800 pr-4">
          {item.question}
        </span>
        <ChevronDownIcon
          className={`shrink-0 text-warm-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-60 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-sm leading-relaxed text-warm-600">{item.answer}</p>
      </div>
    </div>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section className="mt-20 mx-auto max-w-2xl" aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="font-display text-2xl font-bold text-warm-900 text-center sm:text-3xl"
      >
        Frequently asked questions
      </h2>
      <p className="mt-2 text-center text-sm text-warm-500">
        Everything you need to know about SkillCascade pricing.
      </p>

      <div className="mt-8">
        {FAQ_ITEMS.map((item, i) => (
          <FAQItem
            key={item.question}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </section>
  )
}

function CTABanner() {
  return (
    <section
      className="mt-20 rounded-2xl bg-sage-500 px-6 py-12 text-center sm:px-12"
      aria-labelledby="cta-heading"
    >
      <h2
        id="cta-heading"
        className="font-display text-2xl font-bold text-white sm:text-3xl"
      >
        Ready to transform your assessment workflow?
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sage-100 text-sm">
        Start your free trial today. No credit card required. Full access for 14
        days.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/signup"
          className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-sage-700 shadow-sm transition-colors hover:bg-sage-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sage-500"
        >
          Start Free Trial
        </Link>
        <Link
          to="/signup"
          className="rounded-lg border border-white/30 bg-transparent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sage-500"
        >
          Talk to Sales
        </Link>
      </div>
    </section>
  )
}

/* ── Main Component ───────────────────────────────────────── */

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-warm-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* ── Hero ──────────────────────────────────────── */}
        <section className="text-center" aria-labelledby="pricing-heading">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 px-3.5 py-1 text-xs font-semibold text-sage-700 uppercase tracking-wider mb-5">
            <ShieldIcon className="w-3.5 h-3.5 text-sage-500" />
            HIPAA-compliant on every plan
          </div>
          <h1
            id="pricing-heading"
            className="font-display text-4xl font-extrabold tracking-tight text-warm-900 sm:text-5xl"
          >
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-warm-500 text-base sm:text-lg">
            Every plan includes HIPAA-compliant data storage. No hidden fees.
          </p>
          <BillingToggle isAnnual={isAnnual} onChange={setIsAnnual} />
        </section>

        {/* ── Pricing Cards ────────────────────────────── */}
        <div className="mt-14 grid gap-8 lg:grid-cols-3 items-start">
          {TIERS.map((tier) => (
            <PricingCard key={tier.name} tier={tier} isAnnual={isAnnual} />
          ))}
        </div>

        {/* ── Feature Comparison ───────────────────────── */}
        <FeatureComparisonTable isAnnual={isAnnual} />

        {/* ── All Plans Include ────────────────────────── */}
        <AllPlansSection />

        {/* ── FAQ ──────────────────────────────────────── */}
        <FAQSection />

        {/* ── CTA Banner ───────────────────────────────── */}
        <CTABanner />
      </div>
    </div>
  )
}
