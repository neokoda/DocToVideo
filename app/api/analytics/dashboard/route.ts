import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { DashboardData, SceneAnalytics, QuestionFrequency } from '@/types/analytics';

export async function GET(request: NextRequest) {
  const key = request.headers.get('X-Admin-Key');
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('document_id');
  if (!documentId) return Response.json({ error: 'document_id required' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const [eventsRes, scenesRes, qaRes] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('*')
      .eq('document_id', documentId),
    supabase
      .from('scenes')
      .select('scene_index, title, estimated_duration_s')
      .eq('document_id', documentId)
      .order('scene_index'),
    supabase
      .from('qa_interactions')
      .select('question, scene_index, session_id')
      .eq('document_id', documentId),
  ]);

  const events = eventsRes.data ?? [];
  const scenes = scenesRes.data ?? [];
  const qaRows = qaRes.data ?? [];

  // Unique sessions
  const sessionSet = new Set(events.map((e) => e.session_id));
  const uniqueSessions = sessionSet.size;

  // Completion rate: % of sessions that saw the last scene
  const lastSceneIndex = scenes.length - 1;
  const sessionsAtLast = new Set(
    events.filter((e) => e.event_type === 'scene_entered' && e.scene_index === lastSceneIndex).map((e) => e.session_id)
  );
  const completionRate = uniqueSessions > 0 ? (sessionsAtLast.size / uniqueSessions) * 100 : 0;

  // Per-scene analytics
  const sceneAnalytics: SceneAnalytics[] = scenes.map((scene) => {
    const exitEvents = events.filter((e) => e.event_type === 'scene_exited' && e.scene_index === scene.scene_index);
    const entryEvents = events.filter((e) => e.event_type === 'scene_entered' && e.scene_index === scene.scene_index);
    const skipCount = exitEvents.filter((e) => e.payload?.exit_method === 'manual_skip_forward').length;
    const totalWatch = exitEvents.reduce((sum, e) => sum + (e.payload?.time_spent_s ?? 0), 0);
    const avgWatch = exitEvents.length > 0 ? Math.round(totalWatch / exitEvents.length) : 0;
    const completionCount = exitEvents.filter((e) => (e.payload?.narration_progress_pct ?? 0) >= 80).length;
    const completionPct = entryEvents.length > 0 ? Math.round((completionCount / entryEvents.length) * 100) : 0;

    return {
      scene_index: scene.scene_index,
      title: scene.title,
      avg_watch_time_s: avgWatch,
      skip_count: skipCount,
      entry_count: entryEvents.length,
      completion_pct: completionPct,
    };
  });

  // Top questions (group by normalized question text)
  const qFreq = new Map<string, QuestionFrequency>();
  for (const qa of qaRows) {
    const key = qa.question.toLowerCase().trim();
    const existing = qFreq.get(key);
    if (existing) {
      existing.count++;
    } else {
      qFreq.set(key, { question: qa.question, count: 1, scene_index: qa.scene_index });
    }
  }
  const topQuestions = Array.from(qFreq.values()).sort((a, b) => b.count - a.count);

  // Session list for table
  const sessionRows = Array.from(sessionSet).map((sessionId) => {
    const sessionEvents = events.filter((e) => e.session_id === sessionId);
    const endEvent = sessionEvents.find((e) => e.event_type === 'session_end');
    const startEvent = sessionEvents.find((e) => e.event_type === 'session_start');
    const scenesViewed = new Set(
      sessionEvents.filter((e) => e.event_type === 'scene_entered').map((e) => e.scene_index)
    ).size;
    return {
      session_id: sessionId,
      scenes_viewed: scenesViewed,
      total_scenes: scenes.length,
      total_time_s: endEvent?.payload?.total_time_s ?? 0,
      is_return_visit: startEvent?.payload?.is_return_visit ?? false,
      questions_asked: qaRows.filter((q) => q.session_id === sessionId).length,
    };
  });

  const dashboard: DashboardData = {
    document_id: documentId,
    total_sessions: events.filter((e) => e.event_type === 'session_start').length,
    unique_sessions: uniqueSessions,
    completion_rate: completionRate,
    scenes: sceneAnalytics,
    top_questions: topQuestions,
    drop_off_scene: null,
  };

  return Response.json({ dashboard, sessions: sessionRows });
}
