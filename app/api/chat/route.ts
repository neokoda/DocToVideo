import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { streamQAResponse } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  const { document_id, question, session_id, scene_index, scene_title } = await request.json();

  if (!document_id || !question || !session_id) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Fetch document title + all scenes (full-context grounding)
  const { data: doc } = await supabase
    .from('documents')
    .select('title')
    .eq('id', document_id)
    .single();

  if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });

  const { data: scenes } = await supabase
    .from('scenes')
    .select('title, raw_content')
    .eq('document_id', document_id)
    .order('scene_index', { ascending: true });

  // Build full-document context — all scenes concatenated with labels
  const contextChunks = (scenes ?? []).map(s => ({
    content: s.raw_content,
    scene_title: s.title,
  }));

  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (s: string) => new TextEncoder().encode(s);
      let fullAnswer = '';

      try {
        await streamQAResponse(
          doc.title,
          contextChunks,
          question,
          scene_title ?? 'Unknown',
          (chunk) => {
            fullAnswer += chunk;
            controller.enqueue(encode(`data: ${chunk}\n\n`));
          }
        );
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();

        await supabase.from('qa_interactions').insert({
          document_id,
          session_id,
          scene_index: scene_index ?? null,
          question,
          answer: fullAnswer,
          source_chunks: [],
          response_time_ms: Date.now() - startTime,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encode(`data: Sorry, something went wrong: ${msg}\n\n`));
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
