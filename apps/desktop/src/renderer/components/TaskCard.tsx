import { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';
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

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  critical: 'bg-red-100 text-red-600',
};

export default function TaskCard({ task, onClick, isDragging }: Props) {
  const activeEntry = task.timeEntries?.find(e => !e.stoppedAt);
  const hasActiveTimer = !!activeEntry;

  // Live elapsed time counter
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

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg rotate-2' : ''} ${hasActiveTimer ? 'border-green-400 ring-2 ring-green-200 animate-pulse-subtle' : 'border-gray-200'}`}
    >
      {/* Category indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: categoryColors[task.category] || '#6B7280' }}
        />
        <span className="text-xs text-gray-400">{task.category}</span>
        {hasActiveTimer && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-mono font-medium">
            <Timer size={12} className="animate-pulse" />
            {elapsed}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-800 mb-2">{task.title}</h4>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[task.priority] || ''}`}>
          {task.priority}
        </span>

        {(task.projectedDurationMinutes || task.executedDurationMinutes > 0) && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={12} />
            {task.executedDurationMinutes > 0 && (
              <span>{formatMinutes(task.executedDurationMinutes)}</span>
            )}
            {task.projectedDurationMinutes && (
              <span className="text-gray-300">/ {formatMinutes(task.projectedDurationMinutes)}</span>
            )}
          </div>
        )}
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels.map((label) => (
            <span key={label} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
