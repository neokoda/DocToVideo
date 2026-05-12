import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { answerQuestion } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  const { document_id, question, session_id, scene_index, scene_title } = await request.json();

  if (!document_id || !question || !session_id) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

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

  const contextChunks = (scenes ?? []).map(s => ({
    content: s.raw_content,
    scene_title: s.title,
  }));

  const startTime = Date.now();

  try {
    const result = await answerQuestion(doc.title, contextChunks, question, scene_title ?? 'Unknown');

    await supabase.from('qa_interactions').insert({
      document_id,
      session_id,
      scene_index: scene_index ?? null,
      question,
      answer: result.answer,
      source_chunks: result.citations,
      response_time_ms: Date.now() - startTime,
    });

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
