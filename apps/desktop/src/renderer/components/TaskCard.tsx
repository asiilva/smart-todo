import { useState, useEffect } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import { formatMinutes, categoryColors } from '../utils/format';

interface Task {
  id: string;
  title: string;
  description?: string;
  projectedDurationMinutes?: number;
  executedDurationMinutes: number;
  priority: string;
  category: string;
  labels: string[];
  timeEntries?: Array<{ id: string; startedAt: string; stoppedAt?: string; durationMinutes?: number }>;
}

interface Props {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

const priorityDotColors: Record<string, string> = {
  critical: '#F0556E',
  high: '#F5A623',
  medium: '#7C5CFC',
  low: '#9B98B8',
};

export default function TaskCard({ task, onClick, isDragging }: Props) {
  const activeEntry = task.timeEntries?.find(e => !e.stoppedAt);
  const hasActiveTimer = !!activeEntry;

  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!activeEntry) { setElapsed(''); return; }
    const update = () => {
      const started = new Date(activeEntry.startedAt).getTime();
      const diff = Math.floor((Date.now() - started) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const catColor = categoryColors[task.category] || '#6B6894';

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--color-surface)] rounded-[14px] border p-3.5 cursor-grab select-none transition-all duration-200
        ${isDragging ? 'opacity-60 scale-[0.97] rotate-1 border-accent shadow-lift' : 'border-border hover:border-accent/30 hover:shadow-card hover:-translate-y-px'}
        ${hasActiveTimer ? 'border-success ring-2 ring-success/20 animate-pulse-subtle' : ''}`}
      style={{ boxShadow: isDragging ? undefined : '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      {/* Top: Category badge + Priority dot */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="text-[10px] font-bold uppercase tracking-wide text-white px-2.5 py-0.5 rounded-pill"
          style={{ backgroundColor: catColor }}
        >
          {task.category}
        </span>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: priorityDotColors[task.priority] || '#9B98B8',
            boxShadow: task.priority === 'critical' ? `0 0 6px ${priorityDotColors.critical}` : undefined,
          }}
        />
        {hasActiveTimer && (
          <span className="ml-auto text-[11px] font-bold font-mono text-success">
            {elapsed}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold leading-snug text-text mb-2.5">{task.title}</h4>

      {/* Footer: Durations + Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {task.projectedDurationMinutes != null && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill"
              style={{ background: 'rgba(155,152,184,0.12)', color: '#9B98B8' }}>
              <Clock size={10} className="inline -mt-px mr-0.5" />
              {formatMinutes(task.projectedDurationMinutes)}
            </span>
          )}
          {task.executedDurationMinutes > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill"
              style={{
                background: task.projectedDurationMinutes && task.executedDurationMinutes > task.projectedDurationMinutes
                  ? 'rgba(240,85,110,0.12)' : 'rgba(44,193,151,0.12)',
                color: task.projectedDurationMinutes && task.executedDurationMinutes > task.projectedDurationMinutes
                  ? '#F0556E' : '#2CC197',
              }}>
              {formatMinutes(task.executedDurationMinutes)}
            </span>
          )}
        </div>

        {hasActiveTimer && (
          <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
            style={{ background: 'rgba(240,85,110,0.12)', color: '#F0556E' }}>
            <Square size={12} />
          </div>
        )}
      </div>
    </div>
  );
}
