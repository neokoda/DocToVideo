'use client';

import { Users, Clock, SkipForward, MessageSquare, TrendingDown } from 'lucide-react';
import { WatchTimeChart } from './WatchTimeChart';
import { SkipHeatmap } from './SkipHeatmap';
import { QuestionsList } from './QuestionsList';
import { SessionTable } from './SessionTable';
import type { DashboardData } from '@/types/analytics';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}

function StatCard({ label, value, icon, sub }: StatCardProps) {
  return (
    <div className="border border-neutral-200 rounded-[4px] p-4 space-y-2">
      <div className="flex items-center gap-2 text-neutral-400">{icon}<span className="text-xs uppercase tracking-wider font-medium">{label}</span></div>
      <p className="text-2xl font-semibold text-neutral-950 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="border border-neutral-200 rounded-[4px] p-5 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-950 tracking-tight">{title}</h3>
      {children}
    </div>
  );
}

interface AnalyticsDashboardProps {
  data: DashboardData;
  sessions: Array<{
    session_id: string;
    scenes_viewed: number;
    total_scenes: number;
    total_time_s: number;
    is_return_visit: boolean;
    questions_asked: number;
  }>;
}

export function AnalyticsDashboard({ data, sessions }: AnalyticsDashboardProps) {
  const mostSkipped = data.scenes.sort((a, b) => b.skip_count - a.skip_count)[0];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Sessions"
          value={data.unique_sessions}
          icon={<Users className="h-4 w-4" />}
          sub={`${data.total_sessions} total views`}
        />
        <StatCard
          label="Completion"
          value={`${Math.round(data.completion_rate)}%`}
          icon={<TrendingDown className="h-4 w-4" />}
          sub="watched to last scene"
        />
        <StatCard
          label="Most Skipped"
          value={mostSkipped ? `Scene ${mostSkipped.scene_index + 1}` : '—'}
          icon={<SkipForward className="h-4 w-4" />}
          sub={mostSkipped ? `${mostSkipped.skip_count} skips` : ''}
        />
        <StatCard
          label="Questions"
          value={data.top_questions.reduce((a, q) => a + q.count, 0)}
          icon={<MessageSquare className="h-4 w-4" />}
          sub={`${data.top_questions.length} unique`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Avg. Watch Time per Scene">
          <WatchTimeChart scenes={data.scenes} />
        </Section>
        <Section title="Skip Heatmap">
          <SkipHeatmap scenes={data.scenes} />
        </Section>
      </div>

      <Section title="Top Questions Asked">
        <QuestionsList questions={data.top_questions} />
      </Section>

      <Section title="Sessions">
        <SessionTable sessions={sessions} />
      </Section>
    </div>
  );
}
