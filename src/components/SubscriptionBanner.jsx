import useSubscription from '../hooks/useSubscription.js'

/**
 * Shows contextual banners for subscription issues:
 * - Trial expiring (≤3 days left)
 * - Payment failed (past_due)
 * - Subscription ended (canceled)
 */
export default function SubscriptionBanner({ onNavigateToPricing, onOpenBilling }) {
  const { subscription, isActive, isTrial } = useSubscription()

  if (!subscription) return null

  // Trial expiring warning (≤3 days left)
  if (isTrial && subscription.current_period_end) {
    const daysLeft = Math.ceil((new Date(subscription.current_period_end) - Date.now()) / 86_400_000)
    if (daysLeft <= 3 && daysLeft > 0) {
      return (
        <Banner
          color="amber"
          message={`Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Add a payment method to keep your account active.`}
          actionLabel="Manage Billing"
          onAction={onOpenBilling}
        />
      )
    }
    if (daysLeft <= 0) {
      return (
        <Banner
          color="red"
          message="Your trial has expired. Upgrade to continue using SkillCascade."
          actionLabel="View Plans"
          onAction={onNavigateToPricing}
        />
      )
    }
  }

  // Payment failed
  if (subscription.status === 'past_due') {
    return (
      <Banner
        color="amber"
        message="Your payment failed. Please update your payment method to continue using SkillCascade."
        actionLabel="Update Payment"
        onAction={onOpenBilling}
      />
    )
  }

  // Subscription canceled
  if (subscription.status === 'canceled') {
    return (
      <Banner
        color="red"
        message="Your subscription has ended. Upgrade to regain access to premium features."
        actionLabel="View Plans"
        onAction={onNavigateToPricing}
      />
    )
  }

  return null
}

function Banner({ color, message, actionLabel, onAction }) {
  const colors = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  }

  const btnColors = {
    amber: 'bg-amber-600 hover:bg-amber-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
  }

  async function handleClick() {
    if (!onAction) return
    const result = await onAction()
    // If the action returns a URL (billing portal), redirect
    if (typeof result === 'string' && result.startsWith('http')) {
      window.location.href = result
    }
  }

  return (
    <div className={`rounded-xl border px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-sm font-medium">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={handleClick}
          className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${btnColors[color]}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
