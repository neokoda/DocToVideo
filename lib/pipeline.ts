import { getSupabaseServerClient } from '@/lib/supabase/server';
import { segmentDocument, generateNarration, embedText } from '@/lib/gemini';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as { extractRawText(opts: { buffer: Buffer }): Promise<{ value: string }> };

const CHUNK_WORDS = 400;
const OVERLAP_WORDS = 40;
const MAX_TEXT_CHARS = 300_000; // ~75k tokens — well within gemma-4-26b-a4b-it's 128k context

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes('500') || msg.includes('INTERNAL') || msg.includes('fetch failed') || msg.includes('503');
      if (attempt === retries || !isRetryable) throw err;
      const delay = attempt * 3000;
      console.warn(`[pipeline] ${label} attempt ${attempt} failed (${msg.slice(0, 80)}), retrying in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`${label} exhausted retries`);
}

async function extractText(buffer: Buffer, sourceType: string): Promise<string> {
  if (sourceType === 'pdf') {
    const result = await pdfParse(buffer);
    return result.text.trim();
  }
  if (sourceType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }
  if (sourceType === 'pptx') {
    return (await extractPptxText(buffer)).trim();
  }
  throw new Error(`Unsupported source type: ${sourceType}`);
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);
  const slideKeys = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();
  const parts: string[] = [];
  for (const key of slideKeys) {
    const xml = await zip.files[key].async('string');
    const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
    const slideText = matches.map((m: string) => m.replace(/<[^>]+>/g, '')).join(' ');
    if (slideText.trim()) parts.push(slideText);
  }
  return parts.join('\n\n');
}

function fallbackSegment(title: string, text: string) {
  // Split on double newlines or every ~600 words when AI segmentation fails
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 30);
  if (paragraphs.length >= 2) {
    const scenes = [];
    const chunkSize = Math.ceil(paragraphs.length / Math.min(8, Math.ceil(paragraphs.length / 3)));
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      const content = paragraphs.slice(i, i + chunkSize).join('\n\n');
      scenes.push({ scene_index: scenes.length, title: `${title} — Part ${scenes.length + 1}`, raw_content: content });
    }
    return scenes;
  }
  // No paragraph breaks — split by word count
  const words = text.split(/\s+/);
  const scenes = [];
  for (let i = 0; i < words.length; i += 600) {
    const content = words.slice(i, i + 600).join(' ');
    scenes.push({ scene_index: scenes.length, title: `${title} — Part ${scenes.length + 1}`, raw_content: content });
  }
  return scenes;
}

function chunkText(text: string, sceneId: string, documentId: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: { document_id: string; scene_id: string; chunk_index: number; content: string }[] = [];
  let chunkIdx = 0;
  for (let i = 0; i < words.length; i += CHUNK_WORDS - OVERLAP_WORDS) {
    const content = words.slice(i, i + CHUNK_WORDS).join(' ');
    if (!content) continue;
    chunks.push({ document_id: documentId, scene_id: sceneId, chunk_index: chunkIdx++, content });
  }
  if (chunks.length === 0 && text.trim()) {
    chunks.push({ document_id: documentId, scene_id: sceneId, chunk_index: 0, content: text.trim().substring(0, 2000) });
  }
  return chunks;
}

export async function processDocument(documentId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: doc } = await supabase.from('documents').select('*').eq('id', documentId).single();
  if (!doc) throw new Error('Document not found');

  await supabase.from('documents').update({ status: 'processing' }).eq('id', documentId);

  try {
    // ── 1. Extract text ──────────────────────────────────────────────────────
    let text = '';
    if (doc.source_type === 'google_slides') {
      text = `Google Slides document: ${doc.source_url}. Content extraction requires OAuth.`;
    } else {
      const storagePath = `${documentId}/original.${doc.source_type}`;
      const { data: fileBlob, error: dlErr } = await supabase.storage.from('documents').download(storagePath);
      if (dlErr || !fileBlob) throw new Error(`Failed to download file: ${dlErr?.message}`);
      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      console.log(`[pipeline] extracting text from ${doc.source_type}…`);
      text = await extractText(buffer, doc.source_type);
    }

    if (!text.trim()) throw new Error('No text could be extracted from document');
    console.log(`[pipeline] extracted ${text.length} chars`);

    // Truncate very long documents to avoid token overflow
    const truncated = text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
    if (truncated.length < text.length) {
      console.warn(`[pipeline] text truncated from ${text.length} to ${MAX_TEXT_CHARS} chars`);
    }

    // ── 2. Segment into scenes ───────────────────────────────────────────────
    console.log('[pipeline] segmenting…');
    let rawScenes = await withRetry(
      () => segmentDocument(doc.title, truncated),
      'segmentation'
    ).catch(err => {
      console.warn('[pipeline] AI segmentation failed, using fallback:', err.message?.slice(0, 100));
      return fallbackSegment(doc.title, truncated);
    });

    if (!rawScenes.length) rawScenes = fallbackSegment(doc.title, truncated);
    console.log(`[pipeline] ${rawScenes.length} scenes`);

    // ── 3. Generate narrations (parallel, max 3 concurrent) ─────────────────
    console.log(`[pipeline] narrating ${rawScenes.length} scenes (batch=3)…`);
    const NARRATION_CONCURRENCY = 3;
    const scenesToInsert: Record<string, unknown>[] = new Array(rawScenes.length);
    for (let i = 0; i < rawScenes.length; i += NARRATION_CONCURRENCY) {
      const batch = rawScenes.slice(i, i + NARRATION_CONCURRENCY);
      await Promise.all(batch.map(async (scene, j) => {
        const idx = i + j;
        console.log(`[pipeline] narrating scene ${idx + 1}/${rawScenes.length}: ${scene.title}`);
        const narration = await withRetry(
          () => generateNarration(doc.title, idx, rawScenes.length, scene.title, scene.raw_content.slice(0, 3000)),
          `narration[${idx}]`
        ).catch(() => ({
          narration_script: scene.raw_content.slice(0, 500),
          key_claims: [],
          callouts: [],
          estimated_duration_s: 60,
        }));
        scenesToInsert[idx] = {
          document_id: documentId,
          scene_index: idx,
          title: scene.title,
          raw_content: scene.raw_content,
          narration_script: narration.narration_script,
          key_claims: narration.key_claims ?? [],
          callouts: narration.callouts ?? [],
          estimated_duration_s: narration.estimated_duration_s ?? 60,
        };
      }));
    }

    // ── 4. Write scenes ──────────────────────────────────────────────────────
    console.log('[pipeline] inserting scenes…');
    const { data: insertedScenes, error: scenesErr } = await supabase
      .from('scenes')
      .insert(scenesToInsert)
      .select('id, scene_index, raw_content');
    if (scenesErr || !insertedScenes) throw new Error(`Failed to insert scenes: ${scenesErr?.message}`);

    // ── 5. Chunk + embed (parallel, max 5 concurrent) ───────────────────────
    const allChunks = insertedScenes.flatMap(scene =>
      chunkText(scene.raw_content as string, scene.id as string, documentId)
    );
    console.log(`[pipeline] embedding ${allChunks.length} chunks (batch=5)…`);
    const EMBED_CONCURRENCY = 5;
    const chunksToInsert: Record<string, unknown>[] = new Array(allChunks.length);
    for (let i = 0; i < allChunks.length; i += EMBED_CONCURRENCY) {
      const batch = allChunks.slice(i, i + EMBED_CONCURRENCY);
      await Promise.all(batch.map(async (chunk, j) => {
        const embedding = await withRetry(() => embedText(chunk.content), `embed[${i + j}]`);
        chunksToInsert[i + j] = { ...chunk, embedding: `[${embedding.join(',')}]` };
      }));
    }
    if (chunksToInsert.length > 0) {
      const { error: chunksErr } = await supabase.from('document_chunks').insert(chunksToInsert);
      if (chunksErr) throw new Error(`Failed to insert chunks: ${chunksErr.message}`);
    }

    // ── 6. Mark ready ────────────────────────────────────────────────────────
    await supabase.from('documents').update({
      status: 'ready',
      scene_count: insertedScenes.length,
      ready_at: new Date().toISOString(),
    }).eq('id', documentId);
    console.log(`[pipeline] ✓ document ${documentId} ready with ${insertedScenes.length} scenes`);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[pipeline] ✗ failed:', message.slice(0, 200));
    await supabase.from('documents').update({ status: 'failed', error_message: message }).eq('id', documentId);
    throw err;
  }
}
