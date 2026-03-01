import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../lib/safeStorage.js'

const STORAGE_KEY = 'skillcascade_branding'

const DEFAULT_BRANDING = {
  orgName: '',
  tagline: '',
  primaryColor: '#4f8460',
  logoUrl: '',
  reportHeader: '',
  reportFooter: '',
  showPoweredBy: true,
}

function loadBranding() {
  try {
    const raw = safeGetItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_BRANDING, ...JSON.parse(raw) }
  } catch { /* corrupted data — fall through */ }
  return { ...DEFAULT_BRANDING }
}

/* ─────────────────────────────────────────────
   Inline SVG Icons
   ───────────────────────────────────────────── */

const Icons = {
  building: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  upload: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  save: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  reset: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  ),
  palette: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
    </svg>
  ),
  doc: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  eye: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function BrandingSettings({ onBrandingChange }) {
  const { profile } = useAuth()
  const [branding, setBranding] = useState(loadBranding)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  // Load from Supabase org branding on mount
  useEffect(() => {
    if (profile?.organizations?.branding) {
      setBranding((prev) => ({ ...prev, ...profile.organizations.branding }))
    }
  }, [profile])

  // Flash "Saved" confirmation then fade it
  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(t)
  }, [saved])

  /* ── Helpers ─────────────────────────────── */

  function update(field, value) {
    setBranding((prev) => ({ ...prev, [field]: value }))
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => update('logoUrl', reader.result)
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    update('logoUrl', '')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    safeSetItem(STORAGE_KEY, JSON.stringify(branding))
    onBrandingChange?.(branding)

    // Persist to Supabase organization record
    if (profile?.org_id) {
      const { error } = await supabase
        .from('organizations')
        .update({ branding })
        .eq('id', profile.org_id)
      if (error) console.error('Failed to save branding:', error.message)
    }

    setSaved(true)
  }

  async function handleReset() {
    const fresh = { ...DEFAULT_BRANDING }
    setBranding(fresh)
    safeRemoveItem(STORAGE_KEY)
    onBrandingChange?.(fresh)
    if (fileRef.current) fileRef.current.value = ''

    if (profile?.org_id) {
      await supabase
        .from('organizations')
        .update({ branding: {} })
        .eq('id', profile.org_id)
    }
  }

  /* ── Shared field classes ────────────────── */

  const inputCls =
    'w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 ' +
    'placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 transition-colors'

  const labelCls = 'block text-xs font-medium text-warm-500 mb-1'

  const sectionCls = 'space-y-4'

  /* ── Render ──────────────────────────────── */

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0 space-y-8">
      {/* ── Header ──────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-sage-50 text-sage-600 shrink-0">{Icons.building}</div>
        <div>
          <h2 className="font-display text-lg font-semibold text-warm-800">Organization Branding</h2>
          <p className="text-sm text-warm-500 mt-0.5">
            Customize how SkillCascade appears to your team and in generated reports.
            Changes take effect after saving.
          </p>
        </div>
      </div>

      {/* ── Logo Section ────────────────────── */}
      <section className={sectionCls}>
        <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
          </svg>
          Logo
        </h3>

        <div className="flex items-start gap-4">
          {/* Preview area */}
          <div className="w-[200px] h-[60px] rounded-lg border-2 border-dashed border-warm-200 bg-warm-50 flex items-center justify-center overflow-hidden shrink-0">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-xs text-warm-300">No logo set</span>
            )}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-sage-50 text-sage-700 hover:bg-sage-100 cursor-pointer transition-colors">
                {Icons.upload}
                Upload Logo
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              {branding.logoUrl && (
                <button
                  onClick={removeLogo}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-coral-600 hover:bg-coral-50 transition-colors"
                >
                  {Icons.trash}
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-warm-400">Recommended: 200x60px, PNG or SVG</p>
          </div>
        </div>
      </section>

      {/* ── Organization Info ───────────────── */}
      <section className={sectionCls}>
        <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
          {Icons.building}
          Organization Info
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Organization Name</label>
            <input
              type="text"
              value={branding.orgName}
              onChange={(e) => update('orgName', e.target.value)}
              placeholder="Acme Therapy Group"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tagline <span className="text-warm-300">(optional)</span></label>
            <input
              type="text"
              value={branding.tagline}
              onChange={(e) => update('tagline', e.target.value)}
              placeholder="Building skills that last"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* ── Colors ──────────────────────────── */}
      <section className={sectionCls}>
        <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
          {Icons.palette}
          Brand Color
        </h3>

        <div className="flex items-end gap-4">
          <div>
            <label className={labelCls}>Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-warm-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={branding.primaryColor}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) update('primaryColor', v)
                }}
                maxLength={7}
                className={inputCls + ' w-28 font-mono text-center'}
              />
            </div>
          </div>

          {/* Live color preview */}
          <div className="flex items-center gap-3 pb-0.5">
            <button
              type="button"
              className="px-4 py-2 text-xs font-medium text-white rounded-lg shadow-sm transition-colors"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Button Preview
            </button>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Badge
            </span>
          </div>
        </div>
      </section>

      {/* ── Report Customization ────────────── */}
      <section className={sectionCls}>
        <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
          {Icons.doc}
          Report Customization
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Report Header Text</label>
            <input
              type="text"
              value={branding.reportHeader}
              onChange={(e) => update('reportHeader', e.target.value)}
              placeholder="Confidential Assessment Report"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Report Footer Text</label>
            <input
              type="text"
              value={branding.reportFooter}
              onChange={(e) => update('reportFooter', e.target.value)}
              placeholder="© 2026 Acme Therapy Group"
              className={inputCls}
            />
          </div>
        </div>

        {/* Powered-by toggle */}
        <label className="flex items-center justify-between p-3 rounded-lg border border-warm-200 bg-white cursor-pointer hover:border-warm-300 transition-colors">
          <div>
            <span className="text-sm font-medium text-warm-700">Show "Powered by SkillCascade" badge</span>
            <p className="text-xs text-warm-400 mt-0.5">Displays a small attribution on exported reports</p>
          </div>
          <div className="relative shrink-0 ml-4">
            <input
              type="checkbox"
              checked={branding.showPoweredBy}
              onChange={(e) => update('showPoweredBy', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full bg-warm-200 peer-checked:bg-sage-500 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
        </label>
      </section>

      {/* ── Live Preview ────────────────────── */}
      <section className={sectionCls}>
        <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
          {Icons.eye}
          Live Preview
        </h3>

        {/* Branded header mockup */}
        <div className="rounded-lg border border-warm-200 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: branding.primaryColor + '12' }}>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {(branding.orgName || 'S')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-display text-sm font-semibold text-warm-800">
                {branding.orgName || 'SkillCascade'}
              </div>
              {(branding.tagline) && (
                <div className="text-xs text-warm-500">{branding.tagline}</div>
              )}
            </div>
          </div>
          <div className="px-4 py-2 bg-white border-t border-warm-100 text-xs text-warm-400">
            Branded header preview
          </div>
        </div>

        {/* Report header / footer mockup */}
        <div className="rounded-lg border border-warm-200 overflow-hidden bg-white">
          {/* Report header */}
          <div className="px-4 py-2.5 border-b border-warm-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {branding.logoUrl && (
                <img src={branding.logoUrl} alt="" className="h-5 w-auto object-contain opacity-80" />
              )}
              <span className="text-xs font-medium text-warm-600">
                {branding.reportHeader || 'Assessment Report'}
              </span>
            </div>
            <span className="text-xs text-warm-400">Client Name — 02/23/2026</span>
          </div>

          {/* Placeholder content */}
          <div className="px-4 py-6 space-y-2">
            <div className="h-2 w-3/4 rounded bg-warm-100" />
            <div className="h-2 w-full rounded bg-warm-100" />
            <div className="h-2 w-5/6 rounded bg-warm-100" />
            <div className="h-2 w-2/3 rounded bg-warm-100" />
          </div>

          {/* Report footer */}
          <div className="px-4 py-2 border-t border-warm-100 flex items-center justify-between">
            <span className="text-xs text-warm-400">
              {branding.reportFooter || 'Generated by SkillCascade'}
            </span>
            {branding.showPoweredBy && (
              <span className="text-xs text-warm-300 italic">Powered by SkillCascade</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Actions ─────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-warm-100">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-warm-500 hover:text-warm-700 hover:bg-warm-100 transition-colors"
        >
          {Icons.reset}
          Reset to Default
        </button>

        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs font-medium text-sage-600 animate-pulse">
              Branding saved
            </span>
          )}
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {Icons.save}
            Save Branding
          </button>
        </div>
      </div>
    </div>
  )
}
