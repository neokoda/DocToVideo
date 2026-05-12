import { NextRequest } from 'next/server';
import { rewriteScriptSelection } from '@/lib/gemini';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  const adminKey = req.headers.get('X-Admin-Key');
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await params; // sceneId unused — rewrite is stateless
  const { fullScript, selectedText, instruction } = await req.json();

  if (!selectedText || !instruction) {
    return Response.json({ error: 'selectedText and instruction are required' }, { status: 400 });
  }

  try {
    const rewritten = await rewriteScriptSelection(fullScript ?? '', selectedText, instruction);
    return Response.json({ rewritten });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const message = friendlyGeminiError(raw);
    return Response.json({ error: message }, { status: 500 });
  }
}

function friendlyGeminiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const status: string = parsed?.error?.status ?? parsed?.status ?? '';
    const msg: string = parsed?.error?.message ?? parsed?.message ?? '';
    if (status === 'UNAVAILABLE' || msg.toLowerCase().includes('high demand')) {
      return 'The AI model is under high demand. Please wait a moment and try again.';
    }
    if (status === 'RESOURCE_EXHAUSTED' || msg.toLowerCase().includes('quota')) {
      return 'API quota exceeded. Please try again later.';
    }
    if (msg) return msg;
  } catch {
    // not JSON — use raw but strip anything that looks like JSON
    if (raw.startsWith('{')) return 'AI rewrite failed. Please try again.';
  }
  return raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
}
