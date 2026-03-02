import { useState, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { framework } from '../../data/framework.js'
import { getSkillTier, SKILL_PREREQUISITES, SUB_AREA_DEPS, buildReversePrereqMap } from '../../data/skillDependencies.js'
import { TIER_COLORS } from '../../constants/tiers.js'
import { DOMAIN_COLORS } from '../../constants/colors.js'
import useResponsive from '../../hooks/useResponsive.js'

// ── Browse Tab ─────────────────────────────────────────────

function SkillRow({ skill }) {
  const tier = getSkillTier(skill.id)
  return (
    <Link
      to={`/kb/skill-${skill.id}`}
      className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg hover:bg-warm-50 transition-colors group"
    >
      {tier > 0 && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: TIER_COLORS[tier] + '20', color: TIER_COLORS[tier] }}
        >
          T{tier}
        </span>
      )}
      <span className="text-xs text-warm-600 group-hover:text-sage-700 flex-1 min-w-0 truncate">{skill.name}</span>
      <span className="text-warm-200 group-hover:text-sage-400 text-[10px] shrink-0">&rarr;</span>
    </Link>
  )
}

function SkillGroupSection({ skillGroup }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-warm-400 uppercase tracking-wider mb-1">{skillGroup.name}</h4>
      <div className="space-y-0.5">
        {skillGroup.skills.map(skill => (
          <SkillRow key={skill.id} skill={skill} />
        ))}
      </div>
    </div>
  )
}

function SubAreaRow({ subArea, isExpanded, onToggle }) {
  const skillCount = subArea.skillGroups.reduce((sum, sg) => sum + sg.skills.length, 0)
  const deps = SUB_AREA_DEPS[subArea.id] || []

  // Resolve dep names from framework
  const depNames = useMemo(() => {
    if (deps.length === 0) return []
    return deps.map(depId => {
      for (const d of framework) {
        const found = d.subAreas.find(s => s.id === depId)
        if (found) return `${found.name} (D${d.domain})`
      }
      return depId
    })
  }, [deps])

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3 min-h-[44px] text-left hover:bg-warm-50/50 transition-colors"
      >
        <span
          className="text-[10px] text-warm-300 transition-transform duration-200 shrink-0"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#9654;
        </span>
        <span className="text-sm text-warm-700 flex-1 min-w-0">{subArea.name}</span>
        <span className="text-[10px] text-warm-300 shrink-0 whitespace-nowrap">
          {subArea.skillGroups.length} group{subArea.skillGroups.length !== 1 ? 's' : ''} &middot; {skillCount} skill{skillCount !== 1 ? 's' : ''}
        </span>
        <Link
          to={`/kb/subarea-${subArea.id}`}
          onClick={e => e.stopPropagation()}
          className="text-sage-300 hover:text-sage-600 transition-colors shrink-0"
          title="View full article"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </button>
      {isExpanded && (
        <div className="pl-10 pr-5 pb-4">
          {depNames.length > 0 && (
            <p className="text-[10px] text-warm-400 mb-3">
              <span className="font-semibold uppercase tracking-wider">Prerequisites:</span>{' '}
              {depNames.join(', ')}
            </p>
          )}
          <div className="space-y-4">
            {subArea.skillGroups.map(sg => (
              <SkillGroupSection key={sg.id} skillGroup={sg} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DomainExpansion({ domain, expandedSubAreas, setExpandedSubAreas }) {
  const color = DOMAIN_COLORS[domain.id]

  const toggleSubArea = (saId) => {
    setExpandedSubAreas(prev => {
      const next = new Set(prev)
      next.has(saId) ? next.delete(saId) : next.add(saId)
      return next
    })
  }

  return (
    <div
      className="bg-white rounded-xl border border-warm-200 overflow-hidden"
      style={{ borderTopColor: color, borderTopWidth: '3px' }}
    >
      <div className="px-5 py-4 border-b border-warm-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-warm-800">D{domain.domain}: {domain.name}</h3>
          <Link
            to={`/kb/domain-${domain.id}`}
            className="text-[10px] text-sage-500 hover:text-sage-700 font-medium transition-colors shrink-0"
          >
            Full article &rarr;
          </Link>
        </div>
        {domain.coreQuestion && (
          <p className="text-xs text-warm-500 italic mb-1">{domain.coreQuestion}</p>
        )}
        {domain.keyInsight && (
          <p className="text-[11px] text-warm-400 mb-1">{domain.keyInsight}</p>
        )}
        {domain.coreCapacities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {domain.coreCapacities.map((cap, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-warm-50 text-warm-400">{cap}</span>
            ))}
          </div>
        )}
      </div>
      <div className="divide-y divide-warm-100">
        {domain.subAreas.map(sa => (
          <SubAreaRow
            key={sa.id}
            subArea={sa}
            isExpanded={expandedSubAreas.has(sa.id)}
            onToggle={() => toggleSubArea(sa.id)}
          />
        ))}
      </div>
    </div>
  )
}

function DomainCard({ domain, subAreaCount, skillCount, isExpanded, onToggle }) {
  const color = DOMAIN_COLORS[domain.id]

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left px-4 py-4 rounded-xl border transition-all min-h-[44px] ${
        isExpanded
          ? 'bg-white border-sage-300 shadow-sm ring-1 ring-sage-200/50'
          : 'bg-white border-warm-200 hover:border-sage-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
          style={{ backgroundColor: color + '20', color }}
        >
          D{domain.domain}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-warm-800">{domain.name}</div>
          <div className="text-xs text-warm-400 mt-0.5">{domain.subtitle}</div>
          <div className="text-[10px] text-warm-300 mt-1.5">
            {subAreaCount} sub-area{subAreaCount !== 1 ? 's' : ''} &middot; {skillCount} skill{skillCount !== 1 ? 's' : ''}
          </div>
        </div>
        <span
          className="text-[10px] text-warm-300 mt-1 transition-transform duration-200 shrink-0"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#9654;
        </span>
      </div>
    </button>
  )
}

function BrowseTab({ isPhone, isTablet }) {
  const [expandedDomain, setExpandedDomain] = useState(null)
  const [expandedSubAreas, setExpandedSubAreas] = useState(new Set())

  const domainSummaries = useMemo(() => {
    return framework.map(domain => {
      const subAreaCount = domain.subAreas.length
      const skillCount = domain.subAreas.reduce((sum, sa) =>
        sum + sa.skillGroups.reduce((s, sg) => s + sg.skills.length, 0), 0)
      return { domain, subAreaCount, skillCount }
    })
  }, [])

  const cols = isPhone ? 1 : isTablet ? 2 : 3
  const gridClass = isPhone ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'

  const toggleDomain = (id) => {
    setExpandedDomain(prev => {
      if (prev === id) return null
      setExpandedSubAreas(new Set())
      return id
    })
  }

  // Chunk domains into rows for proper expansion placement
  const rows = []
  for (let i = 0; i < domainSummaries.length; i += cols) {
    rows.push(domainSummaries.slice(i, i + cols))
  }

  return (
    <div className="space-y-4">
      {rows.map((row, ri) => {
        const expandedInRow = row.find(r => r.domain.id === expandedDomain)
        return (
          <Fragment key={ri}>
            <div className={`grid ${gridClass} gap-3`}>
              {row.map(({ domain, subAreaCount, skillCount }) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  subAreaCount={subAreaCount}
                  skillCount={skillCount}
                  isExpanded={expandedDomain === domain.id}
                  onToggle={() => toggleDomain(domain.id)}
                />
              ))}
            </div>
            {expandedInRow && (
              <DomainExpansion
                domain={expandedInRow.domain}
                expandedSubAreas={expandedSubAreas}
                setExpandedSubAreas={setExpandedSubAreas}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

// ── Dependencies Tab ───────────────────────────────────────

function DependentSkillRow({ dep, parentDomainId }) {
  return (
    <Link
      to={`/kb/skill-${dep.id}`}
      className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg hover:bg-white transition-colors group"
    >
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
        style={{ backgroundColor: TIER_COLORS[dep.tier] + '20', color: TIER_COLORS[dep.tier] }}
      >
        T{dep.tier}
      </span>
      <span className="text-xs text-warm-600 group-hover:text-sage-700 flex-1 min-w-0 truncate">{dep.name}</span>
      {dep.domainId !== parentDomainId && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-400 shrink-0">
          D{dep.domainNumber}
        </span>
      )}
      <span className="text-warm-200 group-hover:text-sage-400 text-[10px] shrink-0">&rarr;</span>
    </Link>
  )
}

function PrerequisiteCard({ skill, isExpanded, onToggle }) {
  const isFoundation = skill.tier === 1 && skill.prereqs.length === 0

  return (
    <div className="rounded-lg border border-warm-100 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 min-h-[44px] text-left hover:bg-warm-50/50 transition-colors"
      >
        <span
          className="text-[10px] text-warm-300 transition-transform duration-200 shrink-0"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#9654;
        </span>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: TIER_COLORS[skill.tier] + '20', color: TIER_COLORS[skill.tier] }}
        >
          T{skill.tier}
        </span>
        <Link
          to={`/kb/skill-${skill.id}`}
          onClick={e => e.stopPropagation()}
          className="text-xs text-warm-700 hover:text-sage-600 flex-1 min-w-0 truncate"
        >
          {skill.name}
        </Link>
        {isFoundation && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sage-50 text-sage-600 shrink-0">Foundation</span>
        )}
        <span className="text-[10px] text-warm-400 bg-warm-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          Unlocks {skill.dependents.length}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-warm-100 bg-warm-25 px-5 py-3">
          <p className="text-[10px] font-semibold text-warm-400 mb-2 uppercase tracking-wider">Skills this enables:</p>
          <div className="space-y-0.5">
            {skill.dependents.map(dep => (
              <DependentSkillRow key={dep.id} dep={dep} parentDomainId={skill.domainId} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DependencyDomainSection({ domain, expandedSkill, setExpandedSkill, isExpanded, onToggle }) {
  const color = DOMAIN_COLORS[domain.domainId]

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl bg-white border border-warm-200 hover:border-sage-300 transition-all text-left"
      >
        <span
          className="text-[10px] transition-transform duration-200 shrink-0"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', color }}
        >
          &#9654;
        </span>
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: color + '20', color }}
        >
          D{domain.domainNumber}
        </span>
        <span className="text-sm font-semibold text-warm-800 flex-1 min-w-0">{domain.domainName}</span>
        <span className="text-[10px] text-warm-300 bg-warm-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          {domain.skills.length} prerequisite{domain.skills.length !== 1 ? 's' : ''}
        </span>
      </button>
      {isExpanded && (
        <div className="mt-2 ml-4 space-y-1.5">
          {domain.skills.map(skill => (
            <PrerequisiteCard
              key={skill.id}
              skill={skill}
              isExpanded={expandedSkill === skill.id}
              onToggle={() => setExpandedSkill(prev => prev === skill.id ? null : skill.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DependencyTab() {
  const [expandedDomains, setExpandedDomains] = useState(() => new Set(['d1']))
  const [expandedSkill, setExpandedSkill] = useState(null)

  const dependencyData = useMemo(() => {
    const reverseMap = buildReversePrereqMap()

    // Build skill name + domain lookup
    const skillInfo = {}
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            skillInfo[skill.id] = {
              name: skill.name,
              domainId: domain.id,
              domainNumber: domain.domain,
              domainName: domain.name,
            }
          }
        }
      }
    }

    // Group prerequisite skills by domain
    const byDomain = {}
    for (const [prereqId, dependentIds] of Object.entries(reverseMap)) {
      const info = skillInfo[prereqId]
      if (!info || dependentIds.length === 0) continue
      if (!byDomain[info.domainId]) {
        byDomain[info.domainId] = {
          domainId: info.domainId,
          domainNumber: info.domainNumber,
          domainName: info.domainName,
          skills: [],
        }
      }
      byDomain[info.domainId].skills.push({
        id: prereqId,
        name: info.name,
        tier: getSkillTier(prereqId),
        prereqs: SKILL_PREREQUISITES[prereqId] || [],
        domainId: info.domainId,
        dependents: dependentIds.map(did => ({
          id: did,
          name: skillInfo[did]?.name || did,
          tier: getSkillTier(did),
          domainId: skillInfo[did]?.domainId,
          domainNumber: skillInfo[did]?.domainNumber,
        })),
      })
    }

    // Sort domains by number, skills by foundation-first then tier then dependent count
    const sorted = Object.values(byDomain).sort((a, b) => a.domainNumber - b.domainNumber)
    for (const domain of sorted) {
      domain.skills.sort((a, b) => {
        const aF = a.tier === 1 && a.prereqs.length === 0 ? 0 : 1
        const bF = b.tier === 1 && b.prereqs.length === 0 ? 0 : 1
        if (aF !== bF) return aF - bF
        if (a.tier !== b.tier) return a.tier - b.tier
        return b.dependents.length - a.dependents.length
      })
    }

    return sorted
  }, [])

  const toggleDomain = (id) => {
    setExpandedDomains(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-warm-400 mb-4">
        Skills organized by what they unlock. Expand a prerequisite skill to see the skills that depend on it.
      </p>
      {dependencyData.map(domain => (
        <DependencyDomainSection
          key={domain.domainId}
          domain={domain}
          expandedSkill={expandedSkill}
          setExpandedSkill={setExpandedSkill}
          isExpanded={expandedDomains.has(domain.domainId)}
          onToggle={() => toggleDomain(domain.domainId)}
        />
      ))}
    </div>
  )
}

// ── Tab Bar ────────────────────────────────────────────────

function TabBar({ activeTab, onChange }) {
  const tabs = [
    {
      id: 'browse',
      label: 'Browse',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      ),
    },
    {
      id: 'dependencies',
      label: 'Dependencies',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="4" cy="4" r="2.5" />
          <circle cx="12" cy="8" r="2.5" />
          <circle cx="4" cy="12" r="2.5" />
          <path d="M6.5 4.5L9.5 7M6.5 11.5L9.5 9" strokeLinecap="round" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-sage-50 text-sage-700 border border-sage-200'
              : 'text-warm-400 hover:text-warm-600 hover:bg-warm-50 border border-transparent'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────

export default function DomainBrowser() {
  const [activeTab, setActiveTab] = useState('browse')
  const { isPhone, isTablet } = useResponsive()

  return (
    <div>
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'browse' ? (
        <BrowseTab isPhone={isPhone} isTablet={isTablet} />
      ) : (
        <DependencyTab />
      )}
    </div>
  )
}
