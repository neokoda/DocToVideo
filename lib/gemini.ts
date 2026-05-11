import { GoogleGenAI } from '@google/genai';
import type { KeyClaim, Callout } from '@/types/document';

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
  key_claims: KeyClaim[];
  callouts: Callout[];
  estimated_duration_s: number;
}

const NARRATION_SYSTEM = `You are an expert content narrator transforming documents into engaging spoken walkthroughs.

Rules:
- 90–150 words per scene (45–75 seconds at normal speaking pace)
- Sound natural when read aloud — no bullet points
- Preserve all factual claims exactly; do not embellish
- Connect each scene to the document's overall narrative

Return ONLY a raw JSON object (no markdown, no explanation):
{"narration_script":"...","key_claims":[{"text":"...","highlight_type":"statistic|key_term|call_to_action|conclusion","position_hint":"heading|body|footer"}],"callouts":[{"text":"...","callout_type":"emphasis|definition|example|warning","delay_s":5}],"estimated_duration_s":60}`;

const SEGMENTATION_SYSTEM = `You are a document structure analyst. Identify logical topic boundaries and return a JSON array of scenes (aim for 100–400 words per scene).

Return ONLY a raw JSON array (no markdown, no explanation):
[{"scene_index":0,"title":"...","raw_content":"..."}]`;

const QA_SYSTEM = `You are an AI assistant answering questions ONLY from the provided document excerpts.

STRICT RULES:
1. Base your answer solely on the document context provided.
2. If the answer is not present, say exactly: "This question isn't covered in the document. I can only answer based on the uploaded content."
3. Always cite which section your answer comes from at the end (format: "— Source: [Scene Title]").
4. Keep answers to 2–4 sentences unless more detail is clearly needed.
5. Never use outside knowledge, even if you are confident it is accurate.`;

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
    model: 'gemma-4-26b-a4b-it',
    config: { systemInstruction: NARRATION_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  });

  const raw = response.text ?? '{}';
  return JSON.parse(extractJSON(raw)) as NarrationResult;
}

export interface RawScene {
  scene_index: number;
  title: string;
  raw_content: string;
}

export async function segmentDocument(title: string, rawText: string): Promise<RawScene[]> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemma-4-26b-a4b-it',
    config: { systemInstruction: SEGMENTATION_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: `Document title: ${title}\n\nFull extracted text:\n${rawText}` }] }],
  });

  const raw = response.text ?? '[]';
  return JSON.parse(extractJSON(raw)) as RawScene[];
}

export async function streamQAResponse(
  documentTitle: string,
  contextChunks: Array<{ content: string; scene_title: string }>,
  question: string,
  currentSceneTitle: string,
  onChunk: (text: string) => void
): Promise<void> {
  const ai = getClient();
  const context = contextChunks.map((c) => `[Scene: ${c.scene_title}]\n${c.content}`).join('\n\n');
  const userMessage = `Document: "${documentTitle}"\n\nDocument context:\n${context}\n\nQuestion: ${question}\n(The viewer was on "${currentSceneTitle}" when they asked this.)`;

  const responseStream = await ai.models.generateContentStream({
    model: 'gemma-4-26b-a4b-it',
    config: { systemInstruction: QA_SYSTEM },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  });

  for await (const chunk of responseStream) {
    const text = chunk.text;
    if (text) onChunk(text);
  }
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
