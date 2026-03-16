-- Add status tracking to contact submissions for admin support page
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
