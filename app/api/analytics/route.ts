import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { AnalyticsEvent } from '@/types/analytics';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const events: AnalyticsEvent[] = body?.events;

  if (!Array.isArray(events) || events.length === 0) {
    return Response.json({ received: 0 });
  }

  const supabase = getSupabaseServerClient();
  const rows = events.map((e) => ({
    document_id: e.document_id,
    session_id: e.session_id,
    event_type: e.event_type,
    scene_index: e.scene_index ?? null,
    payload: e.payload,
    client_ts: e.client_ts,
  }));

  await supabase.from('analytics_events').insert(rows);

  return Response.json({ received: rows.length });
}
