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
]
