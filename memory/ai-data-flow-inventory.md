# SkillCascade - AI / Data-Flow Inventory

Last updated: 2026-03-30

This file classifies the major current provider paths so the AWS migration has a concrete starting point.

## Status Labels

- **Canonical now** - currently the preferred runtime path
- **Transitional** - exists in production or codebase but should not be expanded
- **Temporary exception** - tolerated for now under clear constraints
- **Must migrate** - not acceptable long term for the product direction

## Main App Auth And Data

### Frontend auth session
- Path: Supabase auth in the frontend
- Status: **Transitional**
- Notes:
  - the frontend still uses Supabase auth/session tokens
  - app API auth currently depends on that token model
  - do not deepen this dependency without an explicit architecture decision

### Main app data API
- Path: frontend -> Cloudflare Worker API -> Postgres/RDS
- Status: **Canonical now**
- Notes:
  - this appears to be the main live data path for app reads/writes
  - still coexists with older Supabase-era assumptions, so the architecture is not fully settled

### Legacy Supabase edge functions
- Path: `supabase/functions/*`
- Status: **Transitional**
- Notes:
  - several functions still exist and may still be referenced
  - treat them as migration surfaces, not a place to add new product complexity unless required for stability

## AI Routes

### Main app AI proxy (Worker API)
- Path: main app -> `/api/ai-proxy` in Worker API
- Provider: AWS Bedrock
- Status: **Canonical now**
- Notes:
  - this should be the default path for PHI/ePHI-capable in-app AI use

### Legacy Supabase AI proxy
- Path: `supabase/functions/ai-proxy`
- Provider: AWS Bedrock
- Status: **Transitional**
- Notes:
  - AWS-aligned, but still part of the parallel legacy function surface

### Main app support chat (Worker API)
- Path: `/api/support-chat`
- Provider: AWS Bedrock
- Status: **Canonical now**
- Notes:
  - support contexts should still be treated as PHI-capable by default
  - de-identification should be treated as defense-in-depth, not permission to relax provider rules

### Legacy Supabase support chat
- Path: `supabase/functions/support-chat`
- Provider: AWS Bedrock
- Status: **Transitional**
- Notes:
  - same guidance as the Worker support route

### Admin email agent
- Path: `admin.skillcascade.com` email-agent functions
- Provider: AWS Bedrock first, Anthropic fallback
- Status: **Temporary exception**
- Notes:
  - acceptable only while this flow is clearly admin-only and non-PHI
  - if support emails or user messages can contain client-identifying clinical information, this becomes **Must migrate**

## Stored Data Paths With Special Attention

### `ai_chats`
- Status: **PHI-capable**
- Notes:
  - chat titles, messages, and client-linked context should be treated as PHI/ePHI-capable
  - provider path may be AWS-safe, but storage and access control still need the same seriousness

### Session notes / sessions / authorizations / files / contacts
- Status: **PHI/ePHI**
- Notes:
  - all related write paths must stay on the AWS-first compliance path and receive high-risk verification

### Client files
- Status: **Must harden**
- Notes:
  - current base64-in-database approach is a product gap even before broader AWS migration

## Practical Routing Rules

### Allowed now
- AWS Bedrock for in-app clinical AI
- AWS Bedrock for support or guidance flows that could touch PHI
- admin-only Bedrock-first tooling with careful scope

### Allowed temporarily
- direct Anthropic fallback for admin-only operational tooling that is clearly non-PHI

### Not acceptable long term
- any PHI/ePHI-capable route with a non-AWS AI fallback
- ambiguity about whether a support or inbox flow might receive PHI
- adding new product features onto transitional provider paths without necessity

## Migration Priority

1. classify every active route as PHI-capable or non-PHI
2. remove ambiguity from support and inbox surfaces
3. keep the main app AI path AWS-only
4. migrate admin exceptions toward AWS consistency
5. retire or quarantine legacy Supabase-era duplicates

## Rule Of Thumb

If a route can receive free text from a clinician, parent, staff member, or support conversation, assume it can receive PHI unless proven otherwise.
