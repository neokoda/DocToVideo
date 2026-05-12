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
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
