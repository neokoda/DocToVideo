/**
 * End-to-end pipeline test for all three document types.
 * Run: node scripts/test-pipeline.mjs
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// ── Config ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://dgxhnsubxmlrtlzuagjb.supabase.co';
const SERVICE_KEY = 'SUPABASE_SERVICE_ROLE_KEY_REDACTED';
const GEMINI_KEY = 'GEMINI_API_KEY_REDACTED';
const MODEL = 'gemma-4-26b-a4b-it';
const EMBED_MODEL = 'gemini-embedding-001';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

const TESTS = [
  { file: 'docs/tests/attention.pdf',                         type: 'pdf',  title: 'Attention Is All You Need' },
  { file: 'docs/tests/Data_Structures_Algorithms_Guide.docx', type: 'docx', title: 'Data Structures & Algorithms Guide' },
  { file: 'docs/tests/Water_Cycle_Presentation.pptx',         type: 'pptx', title: 'Water Cycle Presentation' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function log(label, msg) { console.log(`  [${label}] ${msg}`); }
function ok(label, msg)  { console.log(`  ✓ [${label}] ${msg}`); }
function fail(label, msg){ console.log(`  ✗ [${label}] ${msg}`); }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry(fn, label, retries = 4) {
  for (let i = 1; i <= retries; i++) {
    try { return await fn(); }
    catch (e) {
      const msg = e.message ?? '';
      const retryable = msg.includes('500') || msg.includes('INTERNAL') || msg.includes('fetch') || msg.includes('503');
      if (i === retries || !retryable) throw e;
      console.log(`    [retry] ${label} attempt ${i} — waiting ${i * 5}s`);
      await sleep(i * 5000);
    }
  }
}

function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const aIdx = text.indexOf('['), oIdx = text.indexOf('{');
  const start = aIdx !== -1 && (oIdx === -1 || aIdx < oIdx) ? aIdx : oIdx;
  const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

// ── Text extractors ─────────────────────────────────────────────────────────
async function extractPdf(buf) {
  const result = await pdfParse(buf);
  return { text: result.text.trim(), pages: result.numpages };
}

async function extractDocx(buf) {
  const result = await mammoth.extractRawText({ buffer: buf });
  return { text: result.value.trim(), pages: null };
}

async function extractPptx(buf) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buf);
  const slideKeys = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
  const parts = [];
  for (const key of slideKeys) {
    const xml = await zip.files[key].async('string');
    const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
    const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    if (text.trim()) parts.push(text);
  }
  return { text: parts.join('\n\n').trim(), pages: slideKeys.length };
}

async function extractText(buf, type) {
  if (type === 'pdf')  return extractPdf(buf);
  if (type === 'docx') return extractDocx(buf);
  if (type === 'pptx') return extractPptx(buf);
  throw new Error(`Unknown type: ${type}`);
}

// ── AI calls ─────────────────────────────────────────────────────────────────
const SEG_SYSTEM = `You are a document structure analyst. Identify logical topic boundaries and return a JSON array of scenes (100–400 words each).
Return ONLY a raw JSON array (no markdown): [{"scene_index":0,"title":"...","raw_content":"..."}]`;

const NAR_SYSTEM = `You are an expert narrator transforming documents into engaging spoken walkthroughs (90–150 words per scene).
Return ONLY raw JSON (no markdown): {"narration_script":"...","key_claims":[],"callouts":[],"estimated_duration_s":60}`;

async function segment(title, text) {
  const r = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    config: { systemInstruction: SEG_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: `Document title: ${title}\n\nFull text:\n${text.slice(0, 120000)}` }] }],
  }), 'segment');
  return JSON.parse(extractJSON(r.text));
}

async function narrate(docTitle, idx, total, sceneTitle, content) {
  const r = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    config: { systemInstruction: NAR_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: `Document: "${docTitle}" — Scene ${idx + 1} of ${total}: "${sceneTitle}"\n\nContent:\n${content.slice(0, 3000)}` }] }],
  }), `narrate[${idx}]`);
  const parsed = JSON.parse(extractJSON(r.text));
  return {
    narration_script: parsed.narration_script ?? content.slice(0, 300),
    key_claims: parsed.key_claims ?? [],
    callouts: parsed.callouts ?? [],
    estimated_duration_s: parsed.estimated_duration_s ?? 60,
  };
}

async function embed(text) {
  const r = await withRetry(() => ai.models.embedContent({
    model: EMBED_MODEL,
    contents: [{ role: 'user', parts: [{ text }] }],
  }), 'embed');
  return r.embeddings?.[0]?.values ?? [];
}

// ── Main test runner ─────────────────────────────────────────────────────────
async function testDocument({ file, type, title }) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  TESTING: ${title} (${type.toUpperCase()})`);
  console.log(`${'═'.repeat(60)}`);

  // ── Step 1: Read file
  log('file', `Reading ${file}…`);
  const buf = Buffer.from(fs.readFileSync(file));
  ok('file', `${(buf.length / 1024).toFixed(0)} KB read`);

  // ── Step 2: Create document record
  log('db', 'Creating document record…');
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({ title, source_type: type, status: 'processing' })
    .select().single();
  if (docErr) { fail('db', docErr.message); return null; }
  ok('db', `document id: ${doc.id}`);

  // ── Step 3: Upload to Supabase Storage
  log('storage', 'Uploading to Supabase Storage…');
  const storagePath = `${doc.id}/original.${type}`;
  const { error: upErr } = await supabase.storage.from('documents').upload(storagePath, buf, {
    contentType: type === 'pdf' ? 'application/pdf' : type === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  if (upErr) { fail('storage', upErr.message); }
  else ok('storage', `uploaded to ${storagePath}`);

  // ── Step 4: Extract text
  log('extract', `Extracting text from ${type}…`);
  let extracted;
  try {
    extracted = await extractText(buf, type);
  } catch(e) {
    fail('extract', e.message);
    await supabase.from('documents').update({ status: 'failed', error_message: e.message }).eq('id', doc.id);
    return null;
  }
  if (!extracted.text) { fail('extract', 'No text extracted'); return null; }
  ok('extract', `${extracted.text.length} chars, ${extracted.pages ?? '?'} pages`);
  console.log(`    preview: "${extracted.text.slice(0, 120).replace(/\n/g, ' ')}…"`);

  // ── Step 5: Segment
  log('segment', 'Segmenting into scenes…');
  let scenes;
  try {
    scenes = await segment(title, extracted.text);
  } catch(e) {
    fail('segment', `AI failed: ${e.message.slice(0,80)} — using fallback`);
    const paras = extracted.text.split(/\n{2,}/).filter(p => p.trim().length > 50);
    const chunkSize = Math.max(3, Math.ceil(paras.length / 6));
    scenes = [];
    for (let i = 0; i < paras.length; i += chunkSize) {
      scenes.push({ scene_index: scenes.length, title: `${title} — Part ${scenes.length + 1}`, raw_content: paras.slice(i, i + chunkSize).join('\n\n') });
    }
    if (!scenes.length) scenes = [{ scene_index: 0, title, raw_content: extracted.text.slice(0, 3000) }];
  }
  ok('segment', `${scenes.length} scenes`);
  scenes.forEach((s, i) => console.log(`    Scene ${i+1}: "${s.title}" (${s.raw_content.length} chars)`));

  // ── Step 6: Narrate (parallel, batch 3)
  log('narrate', `Generating narration for ${scenes.length} scenes (batch=3)…`);
  const BATCH = 3;
  const narrations = new Array(scenes.length);
  for (let i = 0; i < scenes.length; i += BATCH) {
    const batch = scenes.slice(i, i + BATCH);
    await Promise.all(batch.map(async (scene, j) => {
      const idx = i + j;
      try {
        narrations[idx] = await narrate(title, idx, scenes.length, scene.title, scene.raw_content);
      } catch(e) {
        console.log(`    fallback narration for scene ${idx+1}: ${e.message.slice(0,60)}`);
        narrations[idx] = { narration_script: scene.raw_content.slice(0,300), key_claims: [], callouts: [], estimated_duration_s: 60 };
      }
    }));
    if (i + BATCH < scenes.length) await sleep(1000);
  }
  ok('narrate', 'All narrations generated');
  console.log(`    Sample script: "${narrations[0]?.narration_script?.slice(0, 120)}…"`);

  // ── Step 7: Insert scenes
  log('db', 'Inserting scenes…');
  const scenesToInsert = scenes.map((s, i) => ({
    document_id: doc.id,
    scene_index: i,
    title: s.title,
    raw_content: s.raw_content,
    narration_script: narrations[i].narration_script,
    key_claims: narrations[i].key_claims,
    callouts: narrations[i].callouts,
    estimated_duration_s: narrations[i].estimated_duration_s,
  }));
  const { data: insertedScenes, error: scenesErr } = await supabase
    .from('scenes').insert(scenesToInsert).select('id, scene_index, raw_content');
  if (scenesErr) { fail('db', `scenes insert: ${scenesErr.message}`); return null; }
  ok('db', `${insertedScenes.length} scenes inserted`);

  // ── Step 8: Chunk + embed (parallel, batch 5)
  log('embed', 'Chunking and embedding…');
  const CHUNK_WORDS = 400, OVERLAP = 40;
  const allChunks = insertedScenes.flatMap(scene => {
    const words = (scene.raw_content ?? '').split(/\s+/).filter(Boolean);
    const chunks = [];
    let idx = 0;
    for (let i = 0; i < words.length; i += CHUNK_WORDS - OVERLAP) {
      const content = words.slice(i, i + CHUNK_WORDS).join(' ');
      if (content) chunks.push({ document_id: doc.id, scene_id: scene.id, chunk_index: idx++, content });
    }
    if (!chunks.length && scene.raw_content?.trim()) {
      chunks.push({ document_id: doc.id, scene_id: scene.id, chunk_index: 0, content: scene.raw_content.slice(0, 2000) });
    }
    return chunks;
  });
  log('embed', `${allChunks.length} chunks to embed…`);

  const EBATCH = 5;
  const chunksToInsert = new Array(allChunks.length);
  for (let i = 0; i < allChunks.length; i += EBATCH) {
    const batch = allChunks.slice(i, i + EBATCH);
    await Promise.all(batch.map(async (chunk, j) => {
      const emb = await withRetry(() => embed(chunk.content), `embed[${i+j}]`);
      chunksToInsert[i + j] = { ...chunk, embedding: `[${emb.join(',')}]` };
    }));
  }

  const { error: chunksErr } = await supabase.from('document_chunks').insert(chunksToInsert);
  if (chunksErr) { fail('embed', chunksErr.message); }
  else ok('embed', `${chunksToInsert.length} chunks embedded (${EMBED_MODEL}, 3072 dims)`);

  // ── Step 9: Mark ready
  await supabase.from('documents').update({
    status: 'ready', scene_count: insertedScenes.length, ready_at: new Date().toISOString(),
  }).eq('id', doc.id);
  ok('ready', `Document marked ready — ${insertedScenes.length} scenes, ${chunksToInsert.length} chunks`);

  // ── Step 10: Verify by re-fetching
  log('verify', 'Re-fetching from Supabase to verify…');
  const { data: verify } = await supabase.from('documents').select('status, scene_count').eq('id', doc.id).single();
  const { data: verifyScenes } = await supabase.from('scenes').select('title, narration_script').eq('document_id', doc.id).order('scene_index');
  const { data: verifyChunks } = await supabase.from('document_chunks').select('id').eq('document_id', doc.id);
  ok('verify', `status=${verify.status}, scenes=${verify.scene_count}, chunks=${verifyChunks?.length}`);
  verifyScenes?.forEach((s, i) => {
    const hasNarration = (s.narration_script?.length ?? 0) > 10;
    console.log(`    Scene ${i+1}: "${s.title}" — narration: ${hasNarration ? '✓' : '✗'}`);
  });

  return { id: doc.id, scenes: insertedScenes.length, chunks: chunksToInsert.length };
}

// ── Run all tests ─────────────────────────────────────────────────────────────
async function main() {
  console.log('DocToVideo — End-to-End Pipeline Test');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  const results = [];
  for (const test of TESTS) {
    const result = await testDocument(test);
    results.push({ ...test, result });
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  for (const { title, type, result } of results) {
    if (result) {
      console.log(`  ✓ ${title} (${type}) — id: ${result.id} | ${result.scenes} scenes | ${result.chunks} chunks`);
      console.log(`    View: http://localhost:3000/view/${result.id}`);
    } else {
      console.log(`  ✗ ${title} (${type}) — FAILED`);
    }
  }
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
