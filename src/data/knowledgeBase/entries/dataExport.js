/**
 * Data & Export — KB entries about importing, exporting, and managing data
 */
export const dataExportEntries = [
  {
    id: 'guide-data-export',
    title: 'Exporting Your Data',
    category: 'data',
    tags: ['export', 'csv', 'json', 'download', 'backup', 'data', 'central reach'],
    summary: 'How to export assessment data as CSV or JSON for use in other systems.',
    body: `SkillCascade supports multiple export formats for interoperability with other clinical systems.

## Export formats

- CSV — Compatible with Excel, Google Sheets, and clinical systems like Central Reach, Raven, and Passage
- JSON — Machine-readable format for data backup or programmatic use
- Goals CSV — 14-column format specifically designed for Central Reach import

## What's exported

Assessment exports include:
- All 260 skill IDs and names
- Current rating for each skill
- Domain, sub-area, and skill group information
- Timestamp of the export

Goals exports additionally include:
- Target level, operational definition, data collection method
- Teaching strategies and measurement guidance

## How to export

Go to Data & Export in the Settings group. Choose your format and click Export. The file downloads to your browser's default download location.`,
    relatedIds: ['guide-data-import', 'view-goals'],
    viewLink: 'data',
    source: 'manual',
  },
  {
    id: 'guide-data-import',
    title: 'Importing Data',
    category: 'data',
    tags: ['import', 'csv', 'json', 'upload', 'central reach', 'raven', 'passage', 'migrate'],
    summary: 'Import assessment data from CSV or JSON files, including from Central Reach, Raven, and Passage.',
    body: `SkillCascade can import assessment data from several formats, making it easy to migrate from other systems.

## Supported formats

- SkillCascade CSV/JSON — Re-import previously exported data
- Central Reach format — Map Central Reach skill codes to SkillCascade skills
- Raven format — Import from Raven Health assessments
- Passage format — Import from Passage (by CentralReach)

## How to import

1. Go to Data & Export
2. Click Import
3. Select your file (CSV or JSON)
4. The import engine automatically detects the format
5. Review the mapping preview (which skills were matched)
6. Confirm to apply the imported ratings

## Important notes

- Import does not delete existing ratings — it only updates skills that have data in the imported file
- Skills that can't be mapped are listed for manual review
- Always save a snapshot before importing to preserve your current state`,
    relatedIds: ['guide-data-export', 'guide-snapshots'],
    viewLink: 'data',
    source: 'manual',
  },
  {
    id: 'guide-data-privacy',
    title: 'Data Privacy & Security',
    category: 'data',
    tags: ['privacy', 'security', 'hipaa', 'encryption', 'data protection', 'safe'],
    summary: 'How SkillCascade protects your data and maintains HIPAA compliance.',
    body: `SkillCascade is designed with HIPAA compliance in mind across all pricing tiers.

## Data protection

- All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)
- Authentication via Supabase with secure session management
- Row-level security (RLS) ensures you can only access your organization's data
- AI features use a secure proxy — no client data is sent directly to AI providers

## Local storage

SkillCascade uses browser localStorage for fast session restore. This data:
- Is encrypted by default in modern browsers
- Never leaves your device unless you explicitly save to the cloud
- Can be cleared via browser settings
- Is supplemented by cloud sync (30-second debounced auto-save)

## Account deletion

You can permanently delete your account and all associated data from the Profile page. This is irreversible and removes all clients, assessments, and snapshots within 30 days.`,
    relatedIds: ['guide-data-export'],
    source: 'manual',
  },
  {
    id: 'guide-ai-features',
    title: 'AI Features',
    category: 'data',
    tags: ['ai', 'artificial intelligence', 'assistant', 'chatgpt', 'openai', 'generate', 'suggestions'],
    summary: 'How SkillCascade uses AI to generate insights, reports, and recommendations.',
    body: `SkillCascade includes AI-powered features that analyze your assessment data and generate clinical content.

## What AI does

- Generates clinical narratives for reports
- Provides contextual suggestions in the Intelligence overview
- Powers the AI Assistant panel for custom queries about your client's data

## Privacy and security

- All AI requests go through a secure server-side proxy — your API key is never exposed to the browser
- Rate limited to 10 requests per minute per user
- Maximum token limits prevent excessive data transmission
- AI-generated content is NOT used to train AI models

## Accuracy

AI-generated content should always be reviewed by a clinician before use in clinical documentation. It provides a starting point, not a final product.`,
    relatedIds: ['view-intelligence', 'view-reports'],
    source: 'manual',
  },
  {
    id: 'guide-data-backup',
    title: 'Data Backup & Recovery',
    category: 'data',
    tags: ['backup', 'recovery', 'restore', 'save', 'cloud', 'local', 'auto-save', 'snapshot', 'export'],
    summary: 'How to back up assessment data and recover it if something goes wrong.',
    body: `SkillCascade uses multiple layers of data protection to keep your assessment data safe. Understanding these layers helps you maintain good backup habits.

## Automatic protection

Two systems work together to prevent data loss:
- Cloud auto-save: Every 30 seconds, unsaved changes are synced to Supabase cloud storage. This happens silently in the background.
- localStorage draft: Every 2 seconds, a local draft is saved to your browser's storage. This provides instant recovery if you close the browser or lose your internet connection.

## Snapshots as point-in-time backups

Snapshots capture all 260 skill ratings at a specific moment. They serve double duty as progress markers and data backups. Save a snapshot before any major change (reassessment, data import, or intervention shift) so you can always compare or revert.

## Manual export backups

For the most durable backup, export your data regularly:
- CSV export: Human-readable spreadsheet format, works in Excel and Google Sheets
- JSON export: Machine-readable format that preserves all data structure
- Store exports in a secure location outside your browser (cloud drive, encrypted folder)

## Recovery scenarios

- Browser cleared or new device: Log in to your account. Cloud-synced data loads automatically on the next session.
- Internet outage during work: The localStorage draft preserves your most recent changes. They sync to the cloud once connectivity returns.
- Accidental rating changes: Load a previous snapshot to compare what changed. If needed, re-import a JSON export to restore a previous state.
- Account issues: If you have a recent JSON export, it can be imported into a new account to restore all assessment data.

## Recommended backup routine

Export a JSON backup monthly, or after any major assessment round. Save snapshots at every reassessment point. These two habits together provide comprehensive data protection.`,
    relatedIds: ['guide-data-export', 'guide-data-privacy', 'guide-data-import'],
    source: 'manual',
  },
  {
    id: 'guide-central-reach-integration',
    title: 'Central Reach Integration',
    category: 'data',
    tags: ['central reach', 'integration', 'import', 'export', 'csv', 'goals', 'interoperability', 'practice management'],
    summary: 'How to import and export data between SkillCascade and Central Reach.',
    body: `SkillCascade is designed to work alongside Central Reach, the widely used ABA practice management system. Data flows both directions — import assessment data from Central Reach and export goals back to it.

## Exporting goals to Central Reach

The Goals view generates treatment goals with a 14-column CSV format specifically designed for Central Reach import. The export includes:
- Skill name, domain, sub-area, and skill group
- Current level and target level
- Operational definition and observable behavior descriptions
- Data collection method and measurement guidance
- Teaching strategies and prerequisite notes

To export: Open the Goals view, click "Export Goals," and save the CSV file. In Central Reach, use their data import feature to upload the file.

## Importing data from Central Reach

If you have existing assessment data in Central Reach, you can bring it into SkillCascade:
1. Export your assessment data from Central Reach as a CSV file
2. In SkillCascade, go to Data & Export and click Import
3. The import engine automatically detects the Central Reach format
4. Review the skill mapping preview — it shows which Central Reach skills were matched to SkillCascade skills
5. Confirm to apply the imported ratings

## Skill mapping

Central Reach uses its own skill taxonomy. The import engine maps Central Reach skills to SkillCascade's 260-skill framework using name matching and category alignment. Skills that cannot be automatically mapped are listed for manual review. Unmapped skills are not lost — they're shown so you can manually assign them.

## Tips for smooth integration

- Export goals after each treatment plan update to keep Central Reach current
- Save a snapshot before importing to preserve your existing ratings
- Review unmapped skills after import — they may indicate gaps in the mapping that you can resolve manually`,
    relatedIds: ['guide-data-export', 'guide-data-import', 'view-full-assessment'],
    source: 'manual',
  },
  {
    id: 'guide-data-migration',
    title: 'Data Migration',
    category: 'data',
    tags: ['migration', 'transfer', 'move', 'account', 'switch', 'raven', 'passage', 'system change'],
    summary: 'How to move assessment data between accounts or from other clinical systems.',
    body: `Whether you're changing accounts, joining a new organization, or switching from another assessment platform, SkillCascade makes it straightforward to migrate your data.

## Moving between SkillCascade accounts

To transfer data from one SkillCascade account to another:
1. In your current account, go to Data & Export
2. Export all client data as JSON (this preserves the full data structure including ratings, snapshots, and metadata)
3. Log into your new account
4. Go to Data & Export and click Import
5. Select the JSON file — all assessment data is restored

Note: Client records, snapshots, and assessment ratings are included in the JSON export. Account settings and preferences are not transferred.

## Importing from other systems

SkillCascade supports import from three major ABA platforms:

### Central Reach
Export your assessment data as CSV from Central Reach. The import engine maps Central Reach skill codes to SkillCascade's framework automatically.

### Raven Health
Export assessment data from Raven as CSV. SkillCascade detects the Raven format and maps skills using Raven's assessment categories.

### Passage (by CentralReach)
Export from Passage in CSV format. The import engine handles the Passage-specific skill taxonomy and maps it to SkillCascade's 260 skills.

## After importing

- Review the mapping summary to see which skills were matched and which need manual attention
- Check domain health in the Status Map to verify the imported data looks reasonable
- Save a snapshot labeled "Imported baseline" to mark the starting point
- Fill in any gaps using the Full Assessment, focusing on skills that couldn't be automatically mapped

## Important notes

- Imports add data — they never delete existing ratings
- If a skill already has a rating, the imported value overwrites it (save a snapshot first as protection)
- Skill taxonomies differ across platforms, so some mapping gaps are normal`,
    relatedIds: ['guide-data-import', 'guide-data-export', 'guide-data-backup'],
    source: 'manual',
  },
  {
    id: 'guide-auto-save',
    title: 'Auto-Save',
    category: 'data',
    tags: ['auto-save', 'automatic', 'save', 'cloud', 'localStorage', 'draft', 'debounce', 'sync', 'no data loss'],
    summary: 'How SkillCascade automatically saves your work so you never lose assessment data.',
    body: `SkillCascade uses a two-tier auto-save system to ensure your work is protected at all times. You never need to manually save — everything is handled in the background.

## Tier 1: localStorage draft (2-second cycle)

Every 2 seconds, your current assessment state is saved to your browser's local storage. This provides:
- Instant recovery if you accidentally close the tab or browser
- Protection during brief internet outages
- Fast session restore when you reopen SkillCascade — your data loads from the local draft before the cloud sync completes

## Tier 2: Cloud sync (30-second cycle)

Every 30 seconds, any unsaved changes are synced to Supabase cloud storage. This provides:
- Cross-device access — your data is available from any browser where you log in
- Protection against device loss or browser data clearing
- A durable server-side copy that persists independently of your browser

## How the two tiers work together

When you open SkillCascade, it loads the localStorage draft immediately for a fast start, then checks the cloud for any newer data (for example, if you made changes on another device). The most recent version wins. This means you get both speed and durability.

## What triggers a save

Any change to assessment ratings, client data, or snapshots triggers the auto-save cycle. The 30-second cloud sync uses debouncing — it waits for a 30-second pause in changes before syncing, which prevents excessive server requests during rapid rating sessions.

## When you should still save manually

Auto-save handles routine data protection, but you should still manually save snapshots at meaningful assessment milestones. Snapshots are intentional, named checkpoints that mark a specific assessment state — auto-save preserves your working state, while snapshots preserve your clinical milestones.

## Verifying save status

The Dashboard header shows a sync indicator. A green check means all changes are synced to the cloud. A spinning icon means a sync is in progress. An orange warning means there are unsynced local changes (usually due to a connectivity issue that will resolve automatically).`,
    relatedIds: ['guide-data-backup', 'guide-data-privacy', 'guide-data-export'],
    source: 'manual',
  },
]
