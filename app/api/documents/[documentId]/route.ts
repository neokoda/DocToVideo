import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const adminKey = req.headers.get('X-Admin-Key');
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { documentId } = await params;
  const supabase = getSupabaseServerClient();

  // Fetch source_type so we know the storage path to remove
  const { data: doc } = await supabase
    .from('documents')
    .select('source_type')
    .eq('id', documentId)
    .single();

  if (doc) {
    // Best-effort: ignore storage errors (file may not exist)
    await supabase.storage
      .from('documents')
      .remove([`${documentId}/original.${doc.source_type}`]);
  }

  // Cascade deletes scenes, document_chunks, analytics_events, qa_interactions
  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const supabase = getSupabaseServerClient();

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error || !doc) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  if (doc.status !== 'ready') {
    return Response.json({
      status: doc.status,
      error_message: doc.error_message,
      scene_count: doc.scene_count,
    });
  }

  const { data: scenes, error: scenesErr } = await supabase
    .from('scenes')
    .select('*')
    .eq('document_id', documentId)
    .order('scene_index', { ascending: true });

  if (scenesErr) {
    return Response.json({ error: 'Failed to fetch scenes' }, { status: 500 });
  }

  return Response.json({ ...doc, scenes: scenes ?? [] });
}
