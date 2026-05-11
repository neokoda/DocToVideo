import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-Webhook-Secret');
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { document_id, status, scene_count, error_message } = body;

  if (!document_id || !status) {
    return Response.json({ error: 'Missing document_id or status' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const update: Record<string, unknown> = { status };
  if (status === 'ready') {
    update.scene_count = scene_count;
    update.ready_at = new Date().toISOString();
  }
  if (status === 'failed') {
    update.error_message = error_message ?? 'Processing failed';
  }

  const { error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', document_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
