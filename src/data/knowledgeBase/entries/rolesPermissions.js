/**
 * Roles & Permissions — KB entries for access control and team management
 */
export const rolesPermissionsEntries = [
  {
    id: 'roles-overview',
    title: 'Roles & Permissions Overview',
    category: 'roles-permissions',
    tags: ['roles', 'permissions', 'access', 'control', 'team', 'staff', 'BCBA', 'RBT', 'admin', 'parent'],
    summary: '8 role types and 11 permission categories provide granular access control for every feature in the platform.',
    body: `SkillCascade uses a role-based access control (RBAC) system with 8 predefined roles and 11 permission categories. This ensures every team member sees exactly what they need — nothing more, nothing less.

## 8 role types

- **Master Admin** — Full access to everything. Manages the organization, billing, and all settings. Typically the practice owner or clinical director.
- **BCBA** — Full clinical access to assigned clients. Can create and approve session notes, manage programs, run assessments, generate reports, and use all AI tools.
- **RBT** — Session-focused access. Can view assigned client programs, collect session data, write draft session notes. Cannot modify assessments, approve notes, or access reports.
- **Office Staff** — Administrative access. Can manage scheduling, client demographics, and files. Cannot access clinical data like assessment scores or session notes.
- **Billing Admin** — Billing and authorization focused. Can view session note approval status, manage authorizations, and access billing-relevant data. Limited clinical access.
- **QA Admin** — Quality assurance access. Can review and approve session notes, audit clinical documentation, and access reports. Cannot modify clinical data.
- **Scheduling Admin** — Schedule management access. Can create, modify, and manage all staff schedules. Limited access to clinical data.
- **Parent** — Parent portal access. Can view shared progress reports, home practice activities, and messages from the clinical team. Cannot access clinical tools or other clients.

## 11 permission categories

Permissions are organized into functional areas:
1. **Clients** — View, create, edit, delete client records
2. **Scheduling** — View, create, edit schedules and sessions
3. **Billing** — View billing data, manage authorizations
4. **Reports** — View, create, approve reports
5. **Programs** — View, create, edit Learning Tree programs
6. **Sessions** — View session data, collect data, end sessions
7. **Goals** — View, create, modify treatment goals
8. **Team** — Invite staff, manage roles, view org analytics
9. **Settings** — Manage organization settings, branding, integrations
10. **AI** — Access AI assistant, client agent, practice intelligence
11. **Clinical** — Access assessment tools, intelligence views, clinical analysis

## Granular feature-level access

Each permission category contains multiple feature-level permissions. For example, within "Reports":
- View reports (all roles except Parent)
- Create reports (BCBA, Master Admin)
- Approve reports (BCBA, QA Admin, Master Admin)
- Delete reports (Master Admin only)

## How roles are assigned

Roles are assigned when inviting a team member to your organization. The Master Admin or any user with Team permissions can invite new staff and assign their role. Roles can be changed at any time.`,
    relatedIds: ['roles-bcba', 'roles-rbt', 'roles-parent', 'guide-data-privacy'],
    source: 'manual',
  },
  {
    id: 'roles-bcba',
    title: 'BCBA Role',
    category: 'roles-permissions',
    tags: ['BCBA', 'role', 'supervisor', 'clinical', 'full access', 'assessment', 'reports'],
    summary: 'The BCBA role provides full clinical access — assessments, programs, reports, AI tools, and session note approval for assigned clients.',
    body: `The BCBA role is designed for Board Certified Behavior Analysts who manage client treatment programs. It provides comprehensive clinical access while restricting organizational management to admins.

## What BCBAs can do

- **Assessment**: Run full assessments and Start Here adaptive assessments for assigned clients
- **Programs**: Create, edit, and manage Learning Tree programs and targets
- **Goals**: Generate, modify, and export treatment goals
- **Reports**: Create and approve authorization reports (26-section builder)
- **Session Notes**: Write, review, and approve session notes for assigned clients and supervised RBTs
- **Sessions**: View session data, but typically RBTs collect trial data
- **AI Tools**: Full access to AI Assistant, Client AI Agent, and Graph Intelligence
- **Intelligence**: Full access to all 6 Clinical Intelligence tabs
- **Visualizations**: All visualization views (Sunburst, Radar, Explorer, etc.)
- **Scheduling**: View and modify schedules for assigned clients
- **Files & Contacts**: Full access to client files and contacts

## What BCBAs cannot do

- Manage organization settings or billing (Master Admin only)
- Invite or remove staff members (requires Team permissions)
- Access clients not assigned to them
- Modify organization branding or subscription`,
    relatedIds: ['roles-overview', 'roles-rbt', 'view-caseload'],
    source: 'manual',
  },
  {
    id: 'roles-rbt',
    title: 'RBT Role',
    category: 'roles-permissions',
    tags: ['RBT', 'role', 'technician', 'data collection', 'sessions', 'limited access'],
    summary: 'The RBT role provides session-focused access — view programs, collect trial data, and write draft session notes for assigned clients.',
    body: `The RBT (Registered Behavior Technician) role is designed for frontline therapists who implement treatment programs and collect session data.

## What RBTs can do

- **View programs**: See assigned client's Learning Tree programs, targets, and phase statuses
- **Collect data**: Record trial-by-trial data during sessions with the data collection interface
- **Write draft notes**: Create session notes in draft status using CPT code templates
- **View schedule**: See their own daily agenda (My Day) and weekly schedule
- **View graphs**: See Graph Dashboard charts for assigned clients
- **Messages**: Send and receive messages within client threads

## What RBTs cannot do

- Modify assessments or assessment scores
- Create or edit programs in the Learning Tree
- Approve session notes (notes stay in draft until BCBA reviews)
- Access Clinical Intelligence or AI tools
- Generate or view authorization reports
- Access clients not assigned to them
- View organization analytics or Practice Intelligence
- Modify any settings

## Design rationale

The RBT role mirrors the scope of practice for Registered Behavior Technicians. They implement programs designed by BCBAs and collect data, but do not make clinical decisions about assessment or treatment planning.`,
    relatedIds: ['roles-overview', 'roles-bcba', 'tool-session-data'],
    source: 'manual',
  },
  {
    id: 'roles-parent',
    title: 'Parent Role',
    category: 'roles-permissions',
    tags: ['parent', 'role', 'portal', 'family', 'caregiver', 'view only', 'progress', 'home practice'],
    summary: 'The Parent role provides portal access to view progress reports, home practice activities, and messages from the clinical team.',
    body: `The Parent role provides a focused, family-friendly view of their child's progress. Parents access the platform through an invitation link and see only content shared by the clinical team.

## What parents can see

- **Progress reports**: Reports shared by the BCBA, presented in parent-friendly language
- **Home practice**: Suggested activities for skill practice at home
- **Messages**: Communication thread with the clinical team
- **Milestones**: Celebrations and achievement certificates shared by the team
- **Parent View**: Simplified developmental overview with strengths and growth areas

## What parents cannot see

- Raw assessment scores or clinical data
- Session notes or trial data
- Clinical intelligence analysis
- Other clients' data
- Staff information or scheduling details
- Billing or authorization information

## Privacy

Parents can only see information for their own child. The BCBA controls what reports and information are shared with the parent portal. PHI protections apply to all parent-facing data.

## Invitation

Parents are added as contacts on the client's profile with "Parent Portal" access level. They receive an email invitation to create an account and access the portal.`,
    relatedIds: ['roles-overview', 'view-parent-view', 'tool-client-contacts'],
    source: 'manual',
  },
]
