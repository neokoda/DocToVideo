-- DocToVideo Database Schema
-- Run these in order in the Supabase SQL editor

-- Enable pgvector for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Documents ────────────────────────────────────────────────────────────────

CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  source_type   TEXT NOT NULL CHECK (source_type IN ('pdf','pptx','docx','google_slides')),
  source_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','ready','failed')),
  error_message TEXT,
  scene_count   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now(),
  ready_at      TIMESTAMPTZ
);

-- ─── Scenes ───────────────────────────────────────────────────────────────────

CREATE TABLE scenes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id          UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  scene_index          INTEGER NOT NULL,
  title                TEXT NOT NULL,
  raw_content          TEXT NOT NULL,
  narration_script     TEXT NOT NULL,
  key_claims           JSONB DEFAULT '[]',
  callouts             JSONB DEFAULT '[]',
  estimated_duration_s INTEGER NOT NULL DEFAULT 60,
  slide_image_url      TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (document_id, scene_index)
);

CREATE INDEX idx_scenes_document_id ON scenes(document_id);

-- ─── Document Chunks (RAG) ────────────────────────────────────────────────────

CREATE TABLE document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  scene_id     UUID REFERENCES scenes(id),
  chunk_index  INTEGER NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(3072),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);

-- Note: ivfflat index not used — gemini-embedding-001 produces 3072 dims which exceeds
-- pgvector's 2000-dim ivfflat limit. Exact cosine search is sufficient for demo scale.

-- ─── Analytics Events ─────────────────────────────────────────────────────────

CREATE TABLE analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  session_id   UUID NOT NULL,
  event_type   TEXT NOT NULL,
  scene_index  INTEGER,
  payload      JSONB DEFAULT '{}',
  client_ts    TIMESTAMPTZ NOT NULL,
  server_ts    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_document_event ON analytics_events(document_id, event_type);
CREATE INDEX idx_events_document_scene  ON analytics_events(document_id, scene_index, event_type);
CREATE INDEX idx_events_session         ON analytics_events(session_id);

-- ─── Q&A Interactions ─────────────────────────────────────────────────────────

CREATE TABLE qa_interactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  session_id       UUID NOT NULL,
  scene_index      INTEGER,
  question         TEXT NOT NULL,
  answer           TEXT NOT NULL,
  source_chunks    JSONB DEFAULT '[]',
  response_time_ms INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_qa_document_id ON qa_interactions(document_id);
