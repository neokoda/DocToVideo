import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const key = request.headers.get('X-Admin-Key');
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, source_type, status, scene_count, created_at, ready_at')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ documents: data ?? [] });
}
