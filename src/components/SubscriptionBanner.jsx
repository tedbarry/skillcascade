import useSubscription from '../hooks/useSubscription.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function SubscriptionBanner({ onNavigateToPricing, onOpenBilling }) {
  const { profile } = useAuth()
  const { subscription, isActive, isTrial, isExpired, isPastDue, needsSubscription, trialDaysLeft, plan, loading } = useSubscription()

  // Never show banners for super admins or while loading
  if (loading || profile?.is_super_admin) return null
  if (!subscription) return null

  // No subscription yet — prompt to pick a plan
  if (needsSubscription) {
    return (
      <Banner
        color="amber"
        message="Choose a plan to get started. Every plan includes a 14-day free trial."
        actionLabel="View Plans"
        onAction={onNavigateToPricing}
      />
    )
  }

  // Stripe-managed trial — show countdown from day 1
  if (isTrial && trialDaysLeft !== null) {
    if (trialDaysLeft <= 0) {
      return (
        <Banner
          color="red"
          message="Your trial has ended and your card will be charged. Manage your subscription in billing."
          actionLabel="Manage Billing"
          onAction={onOpenBilling}
        />
      )
    }
    if (trialDaysLeft <= 3) {
      return (
        <Banner
          color="amber"
          message={`Your trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}. You'll be charged automatically unless you cancel.`}
          actionLabel="Manage Billing"
          onAction={onOpenBilling}
        />
      )
    }
    // 4+ days left — friendly info banner
    return (
      <Banner
        color="info"
        message={`${plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : ''} plan trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining. No charge until trial ends.`}
        actionLabel="Manage Billing"
        onAction={onOpenBilling}
      />
    )
  }

  if (isPastDue) {
    return (
      <Banner
        color="amber"
        message="Your payment failed. Please update your payment method to continue using SkillCascade."
        actionLabel="Update Payment"
        onAction={onOpenBilling}
      />
    )
  }

  if (isExpired) {
    return (
      <Banner
        color="red"
        message="Your subscription has ended. Subscribe to regain access. Your data is saved for 90 days."
        actionLabel="View Plans"
        onAction={onNavigateToPricing}
      />
    )
  }

  return null
}

function Banner({ color, message, actionLabel, onAction }) {
  const colors = {
    info: 'bg-sage-50 border-sage-200 text-sage-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  }
  const btnColors = {
    info: 'bg-sage-600 hover:bg-sage-700 text-white',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
  }

  async function handleClick() {
    if (!onAction) return
    const result = await onAction()
    if (typeof result === 'string' && result.startsWith('http')) {
      window.location.href = result
    }
  }

  return (
    <div className={`rounded-xl border px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shadow-sm ${colors[color]}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {color === 'info' ? (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        )}
        <p className="text-sm font-medium">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={handleClick}
          className={`px-4 py-2 min-h-[44px] rounded-full text-sm font-semibold transition-colors flex-shrink-0 ${btnColors[color]}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
