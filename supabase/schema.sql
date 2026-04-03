-- ============================
-- Cepuin — Database Schema
-- Run this in Supabase SQL Editor
-- ============================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================
-- TABLE: reports
-- =============================
CREATE TABLE reports (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category      TEXT NOT NULL CHECK (category IN (
    'jalan_berlubang', 'lampu_mati', 'banjir',
    'sampah_menumpuk', 'drainase_rusak', 'fasilitas_umum', 'lainnya'
  )),
  description   TEXT,
  photo_url     TEXT,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  address       TEXT,
  status        TEXT NOT NULL DEFAULT 'dilaporkan' CHECK (status IN (
    'dilaporkan', 'diverifikasi', 'dikerjakan', 'selesai', 'ditolak'
  )),
  urgency_score INTEGER NOT NULL DEFAULT 0,
  vote_count    INTEGER NOT NULL DEFAULT 0,
  assigned_to   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geo queries (bounding box)
CREATE INDEX idx_reports_location ON reports (lat, lng);
-- Index for feed sorting
CREATE INDEX idx_reports_urgency ON reports (urgency_score DESC);
-- Index for status filter
CREATE INDEX idx_reports_status ON reports (status);

-- =============================
-- TABLE: votes
-- =============================
CREATE TABLE votes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id   UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce 1 vote per user OR 1 vote per session per report
  UNIQUE (report_id, user_id),
  UNIQUE (report_id, session_id)
);

-- Index for counting votes per report
CREATE INDEX idx_votes_report ON votes (report_id);

-- =============================
-- TABLE: status_history
-- =============================
CREATE TABLE status_history (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id   UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL CHECK (new_status IN (
    'dilaporkan', 'diverifikasi', 'dikerjakan', 'selesai', 'ditolak'
  )),
  changed_by  TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for timeline queries
CREATE INDEX idx_status_history_report ON status_history (report_id, created_at);

-- =============================
-- TRIGGER: Auto-update updated_at
-- =============================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================
-- TRIGGER: Auto-increment vote_count
-- =============================
CREATE OR REPLACE FUNCTION increment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reports
  SET vote_count = vote_count + 1
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_votes
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION increment_vote_count();

-- =============================
-- ROW LEVEL SECURITY (RLS)
-- =============================

-- Reports: public read, authenticated+anon can insert, admin can update
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports"
  ON reports FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert reports"
  ON reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update reports"
  ON reports FOR UPDATE
  USING (
    auth.jwt() ->> 'email' LIKE '%@admin.cepuin.id'
    OR auth.role() = 'service_role'
  );

-- Votes: public insert+read
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can vote"
  ON votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read votes"
  ON votes FOR SELECT
  USING (true);

-- Status History: public read, admin insert
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read status history"
  ON status_history FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert status history"
  ON status_history FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%@admin.cepuin.id'
    OR auth.role() = 'service_role'
  );
