import usePermissions from '../hooks/usePermissions.js'

/**
 * PermissionGate — wraps content that requires a specific permission.
 * Usage: <PermissionGate permission="clients.edit">...</PermissionGate>
 *        <PermissionGate permission="billing.view" fallback={<p>No access</p>}>...</PermissionGate>
 *
 * permission format: "category.action" (e.g. "clients.edit", "ai.use", "clinical.access")
 * For category-level check (any action): "category" (e.g. "billing")
 */
export default function PermissionGate({ permission, fallback = null, children }) {
  const { can, canAny, loading } = usePermissions()

  // Don't block while permissions are loading
  if (loading) return null

  const parts = permission.split('.')
  const category = parts[0]
  const action = parts[1]

  const allowed = action ? can(category, action) : canAny(category)

  if (allowed) return children

  return fallback
}

/**
 * NoPermission — default fallback for blocked areas.
 * Shows a clean "no access" message. Use as: <PermissionGate ... fallback={<NoPermission />}>
 */
export function NoPermission({ message }) {
  return (
    <div className="flex items-center justify-center min-h-[300px] px-4">
      <div className="max-w-sm w-full text-center">
        <div className="bg-warm-50 rounded-xl border border-warm-200 p-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-warm-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-warm-700 font-display mb-2">
            Access Restricted
          </h3>
          <p className="text-sm text-warm-500 leading-relaxed">
            {message || 'You don\'t have permission to access this area. Contact your admin to request access.'}
          </p>
        </div>
      </div>
    </div>
  )
}
