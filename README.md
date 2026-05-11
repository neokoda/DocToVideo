# DocToVideo

AI-powered document-to-interactive-video platform. Upload a PDF, PowerPoint, Word doc, or Google Slides link — the app auto-segments it into scenes, generates spoken narration, plays it back with animated overlays and highlights, and answers questions about it using RAG-grounded AI.

**Live demo:** [add Vercel URL here after deploy]

---

## What it does

- **Upload** PDF / PPTX / DOCX / Google Slides (admin)
- **Auto-parse** into logical scenes (structural → semantic → token-window fallback)
- **AI narration** per scene via Gemma 4 27B — 90–150 words, natural speech, structured JSON with `key_claims` and `callouts`
- **Interactive player** — animated scene transitions, timed callout overlays, inline text highlights, Web Speech API TTS
- **Grounded Q&A** — RAG with pgvector: embed question → cosine search → top-6 chunks → streamed answer with scene citations
- **Analytics dashboard** — watch time, skip heatmap, repeat visitors, top questions (admin)

---

## Stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 16 (App Router) |
| Database + Storage | Supabase (PostgreSQL + pgvector + Storage) |
| AI (narration, Q&A, segmentation) | Gemini API — `gemma-4-27b-it` |
| AI (embeddings) | Gemini API — `text-embedding-004` (768d) |
| Pipeline automation | n8n.cloud |
| Narration audio | Web Speech API (browser-native) |
| Animations | framer-motion |
| Deployment | Vercel + Supabase + n8n.cloud |

All free-tier services — no credit card required to run the full stack.

---

## Setup

See [`docs/BUILD.md`](docs/BUILD.md) for the complete step-by-step guide. Summary:

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the three migration files in SQL Editor (in order):
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_match_chunks.sql`
   - `supabase/migrations/003_storage.sql`
3. Copy your Project URL, anon key, and service role key

### 2. Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com) → Get API key
2. Free tier: 1,500 requests/day for `gemma-4-27b-it`, unlimited for `text-embedding-004`

### 3. n8n.cloud

1. Start a free trial at [n8n.cloud](https://n8n.cloud)
2. Build the `doc-to-video-pipeline` workflow following [`docs/BUILD.md`](docs/BUILD.md#step-3-n8n-cloud-workflow)
3. Copy the webhook trigger URL

### 4. Local development

```bash
git clone <this-repo>
cd DocToVideo
npm install
cp .env.example .env.local
# Fill in all values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
vercel
```

Or connect the GitHub repo in the Vercel dashboard and add the environment variables.

---

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `GEMINI_API_KEY` | Google AI Studio API key (server only) |
| `N8N_WEBHOOK_URL` | n8n workflow trigger URL |
| `N8N_WEBHOOK_SECRET` | Shared secret for n8n auth |
| `ADMIN_API_KEY` | Admin password for upload and dashboard |
| `NEXT_PUBLIC_APP_URL` | Vercel deployment URL (for n8n callbacks) |

---

## Project structure

```
app/                  API routes + pages (Next.js App Router)
components/
  upload/             FileDropzone, GoogleSlidesInput, ProcessingStatus
  player/             DocumentPlayer, SceneRenderer, NarrationController, ...
  qa/                 QAPanel, QAMessage, QAInput
  analytics/          AnalyticsDashboard, WatchTimeChart, SkipHeatmap, ...
hooks/                useDocumentPlayer, useNarration, useAnalytics, useQAChat
lib/                  gemini.ts, supabase/, session.ts, analytics.ts, tts.ts
types/                document.ts, analytics.ts, qa.ts
supabase/migrations/  SQL schema + pgvector function + storage buckets
docs/                 ARCHITECTURE, PROMPTS, SCHEMA, BUILD, LIMITATIONS
```

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System diagram, data flow, component tree, player state machine
- [`docs/PROMPTS.md`](docs/PROMPTS.md) — All 3 AI prompts with version history, example I/O, edge cases
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — Scene JSON schema, AnalyticsEvent type, full DB schema
- [`docs/BUILD.md`](docs/BUILD.md) — Step-by-step setup, n8n node instructions, Vercel deploy, smoke test
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — Hallucination risks, privacy, scale limits, browser compatibility
