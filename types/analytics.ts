export type EntryMethod = 'auto_advance' | 'manual_click' | 'scrubber';
export type ExitMethod = 'auto_advance' | 'manual_skip_forward' | 'manual_skip_back' | 'qa_opened';
export type UserAgentClass = 'mobile' | 'tablet' | 'desktop';

interface BaseEvent {
  document_id: string;
  session_id: string;
  client_ts: string;
}

export type AnalyticsEvent = BaseEvent &
  (
    | { event_type: 'session_start'; scene_index: null; payload: { is_return_visit: boolean; user_agent_class: UserAgentClass } }
    | { event_type: 'session_end'; scene_index: null; payload: { total_time_s: number; scenes_viewed: number[]; completion_pct: number } }
    | { event_type: 'document_opened'; scene_index: null; payload: { referrer: string } }
    | { event_type: 'document_completed'; scene_index: null; payload: { total_time_s: number } }
    | { event_type: 'scene_entered'; scene_index: number; payload: { entry_method: EntryMethod } }
    | { event_type: 'scene_exited'; scene_index: number; payload: { time_spent_s: number; narration_progress_pct: number; exit_method: ExitMethod } }
    | { event_type: 'scene_replayed'; scene_index: number; payload: { replay_count: number } }
    | { event_type: 'playback_paused'; scene_index: number; payload: { narration_progress_pct: number } }
    | { event_type: 'playback_resumed'; scene_index: number; payload: Record<string, never> }
    | { event_type: 'narration_toggled'; scene_index: null; payload: { enabled: boolean } }
    | { event_type: 'playback_speed_changed'; scene_index: null; payload: { speed: number } }
    | { event_type: 'qa_panel_opened'; scene_index: number; payload: Record<string, never> }
    | { event_type: 'qa_question_asked'; scene_index: number; payload: { question_length_chars: number; response_time_ms: number } }
  );

export interface DashboardData {
  document_id: string;
  total_sessions: number;
  unique_sessions: number;
  completion_rate: number;
  scenes: SceneAnalytics[];
  top_questions: QuestionFrequency[];
  drop_off_scene: number | null;
}

export interface SceneAnalytics {
  scene_index: number;
  title: string;
  avg_watch_time_s: number;
  skip_count: number;
  entry_count: number;
  completion_pct: number;
}

export interface QuestionFrequency {
  question: string;
  count: number;
  scene_index: number | null;
}
