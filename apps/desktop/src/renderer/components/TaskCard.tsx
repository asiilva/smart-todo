import { Clock, Timer } from 'lucide-react';

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

const categoryColors: Record<string, string> = {
  work: '#3B82F6',
  exercise: '#10B981',
  family: '#F59E0B',
  personal: '#8B5CF6',
  errand: '#EF4444',
  learning: '#06B6D4',
};

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TaskCard({ task, onClick, isDragging }: Props) {
  const hasActiveTimer = task.timeEntries?.some(e => !e.stoppedAt);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg rotate-2' : ''}`}
    >
      {/* Category indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: categoryColors[task.category] || '#6B7280' }}
        />
        <span className="text-xs text-gray-400">{task.category}</span>
        {hasActiveTimer && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
            <Timer size={12} className="animate-pulse" />
            Running
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
