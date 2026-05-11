'use client';

interface SessionRow {
  session_id: string;
  scenes_viewed: number;
  total_scenes: number;
  total_time_s: number;
  is_return_visit: boolean;
  questions_asked: number;
}

interface SessionTableProps {
  sessions: SessionRow[];
}

export function SessionTable({ sessions }: SessionTableProps) {
  if (sessions.length === 0) return <p className="text-xs text-neutral-400">No sessions recorded yet.</p>;

  const fmt = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100">
            <th className="text-left py-2 pr-4 font-medium text-neutral-400 uppercase tracking-wider">Session</th>
            <th className="text-left py-2 pr-4 font-medium text-neutral-400 uppercase tracking-wider">Scenes</th>
            <th className="text-left py-2 pr-4 font-medium text-neutral-400 uppercase tracking-wider">Time</th>
            <th className="text-left py-2 pr-4 font-medium text-neutral-400 uppercase tracking-wider">Questions</th>
            <th className="text-left py-2 font-medium text-neutral-400 uppercase tracking-wider">Type</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((row) => (
            <tr key={row.session_id} className="border-b border-neutral-50 hover:bg-neutral-50">
              <td className="py-2 pr-4 font-mono text-neutral-400">{row.session_id.slice(0, 8)}…</td>
              <td className="py-2 pr-4 text-neutral-700">{row.scenes_viewed}/{row.total_scenes}</td>
              <td className="py-2 pr-4 text-neutral-700">{fmt(row.total_time_s)}</td>
              <td className="py-2 pr-4 text-neutral-700">{row.questions_asked}</td>
              <td className="py-2">
                <span className={`px-1.5 py-0.5 rounded-[2px] ${row.is_return_visit ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-950 text-white'}`}>
                  {row.is_return_visit ? 'Return' : 'New'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
