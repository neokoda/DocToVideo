import { GoogleGenAI } from '@google/genai';
import type { KeyClaim, Callout, NarratedSection } from '@/types/document';

let geminiClient: GoogleGenAI | null = null;

function getClient() {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return geminiClient;
}

// Extract JSON from model output — handles markdown fences and bare JSON
function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('[') !== -1 && (text.indexOf('[') < (text.indexOf('{') === -1 ? Infinity : text.indexOf('{')))
    ? text.indexOf('[')
    : text.indexOf('{');
  const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

export interface NarrationResult {
  narration_script: string;
  sections: NarratedSection[];
  key_claims: KeyClaim[];
  callouts: Callout[];
  estimated_duration_s: number;
}

const NARRATION_SYSTEM = `You are an expert content narrator transforming documents into engaging spoken walkthroughs.

Rules:
- Write 2–5 semantic sections. Each covers one clear subtopic of the scene.
  - title: short label (3–6 words)
  - content: natural spoken prose for that subtopic (20–50 words). Wrap key terms, numbers, and important phrases in **double asterisks** for emphasis.
- Total words across all sections: 90–150. Preserve all factual claims exactly.
- key_claims: 3–5 bullet points, each a SHORT sentence of 4–8 words summarising one key insight (e.g. "Stacks use LIFO ordering" or "Insertion runs in O(1) time"). Not single words, not full paragraphs.
- Do NOT include a "narration_script" field — it is derived from sections in code.

Return ONLY raw JSON (no markdown):
{"sections":[{"title":"...","content":"Text with **key terms** bolded..."}],"key_claims":[{"text":"4-8 word sentence","highlight_type":"statistic|key_term|call_to_action|conclusion","position_hint":"heading|body|footer"}],"callouts":[],"estimated_duration_s":60}`;

const SEGMENTATION_SYSTEM = `You are a document structure analyst. Identify logical topic boundaries and return a JSON array of scenes (aim for 100–400 words per scene).

Return ONLY a raw JSON array (no markdown, no explanation):
[{"scene_index":0,"title":"...","raw_content":"..."}]`;

const QA_SYSTEM = `You are an AI assistant answering questions ONLY from the provided document excerpts.

STRICT RULES:
1. Base your answer solely on the document context provided.
2. If the answer is not present, set answer to exactly: "This question isn't covered in the document. I can only answer based on the uploaded content." and citations to [].
3. Keep your answer to 2-4 sentences unless more detail is clearly needed.
4. Never use outside knowledge, even if you are confident it is accurate.
5. For citations: copy 1-3 verbatim sentences or phrases word-for-word from the document context that directly support your answer. Do not paraphrase.`;

export interface QAResult {
  answer: string;
  citations: Array<{ quote: string; scene_title: string }>;
}

export async function answerQuestion(
  documentTitle: string,
  contextChunks: Array<{ content: string; scene_title: string }>,
  question: string,
  currentSceneTitle: string,
): Promise<QAResult> {
  const ai = getClient();
  const context = contextChunks.map((c) => `[Scene: ${c.scene_title}]\n${c.content}`).join('\n\n');
  const userMessage = `Document: "${documentTitle}"\n\nDocument context:\n${context}\n\nQuestion: ${question}\n(The viewer was on "${currentSceneTitle}" when they asked this.)`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    config: {
      systemInstruction: QA_SYSTEM,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          citations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                quote: { type: 'string' },
                scene_title: { type: 'string' },
              },
              required: ['quote', 'scene_title'],
            },
          },
        },
        required: ['answer', 'citations'],
      },
    },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  });

  const raw = response.text ?? '{"answer":"","citations":[]}';
  return JSON.parse(extractJSON(raw)) as QAResult;
}

export async function generateNarration(
  documentTitle: string,
  sceneIndex: number,
  totalScenes: number,
  sceneTitle: string,
  rawContent: string
): Promise<NarrationResult> {
  const ai = getClient();
  const userMessage = `Document: "${documentTitle}" — Scene ${sceneIndex + 1} of ${totalScenes}: "${sceneTitle}"\n\nContent:\n${rawContent}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    config: { systemInstruction: NARRATION_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  });

  const raw = response.text ?? '{}';
  const parsed = JSON.parse(extractJSON(raw)) as Omit<NarrationResult, 'narration_script'> & { narration_script?: string };

  // Always derive narration_script from sections so they're guaranteed identical
  const sections: NarratedSection[] = parsed.sections ?? [];
  const narration_script = sections.map(s => s.content.replace(/\*\*/g, '')).join(' ');

  return {
    narration_script,
    sections,
    key_claims: parsed.key_claims ?? [],
    callouts: parsed.callouts ?? [],
    estimated_duration_s: parsed.estimated_duration_s ?? 60,
  };
}

export interface RawScene {
  scene_index: number;
  title: string;
  raw_content: string;
}

export async function segmentDocument(title: string, rawText: string): Promise<RawScene[]> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    config: { systemInstruction: SEGMENTATION_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: `Document title: ${title}\n\nFull extracted text:\n${rawText}` }] }],
  });

  const raw = response.text ?? '[]';
  return JSON.parse(extractJSON(raw)) as RawScene[];
}

const REWRITE_SYSTEM = `You are editing a narration script. Rewrite only the provided selected text according to the user's instruction.
Rules:
- Match the style and tone of the surrounding narration
- Keep it natural for speech — no bullet points, no headings
- Return ONLY the replacement text. No quotes, no explanation, no markdown.`;

export async function rewriteScriptSelection(
  fullScript: string,
  selectedText: string,
  instruction: string
): Promise<string> {
  const ai = getClient();
  const userMessage = `Full narration script (context only):\n"${fullScript}"\n\nSelected text to rewrite:\n"${selectedText}"\n\nInstruction: ${instruction}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    config: { systemInstruction: REWRITE_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  });
  return (response.text ?? selectedText).trim();
}

const SECTIONS_ONLY_SYSTEM = `Split this narration script into 2–5 semantic subtopic sections for on-screen display.
- content must be the EXACT words from the script (no rewording), split at natural boundaries
- Wrap key terms, numbers, and important phrases in **double asterisks**
- The sections joined (** stripped) must equal the original script exactly
Return ONLY a raw JSON array (no markdown):
[{"title":"short label (3–6 words)","content":"section text with **key terms** bolded"}]`;

export async function regenerateSections(narrationScript: string): Promise<import('@/types/document').NarratedSection[]> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    config: { systemInstruction: SECTIONS_ONLY_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: narrationScript }] }],
  });
  const raw = response.text ?? '[]';
  return JSON.parse(extractJSON(raw));
}

export async function embedText(text: string): Promise<number[]> {
  const ai = getClient();
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: [{ role: 'user', parts: [{ text }] }],
  });

  const embedding = result.embeddings?.[0]?.values;
  if (!embedding) throw new Error('No embedding returned');
  return embedding;
}
