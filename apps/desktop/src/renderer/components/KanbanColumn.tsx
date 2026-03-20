import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskCard from './SortableTaskCard';
import { Plus } from 'lucide-react';

interface Task {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  projectedDurationMinutes?: number;
  executedDurationMinutes: number;
  priority: string;
  category: string;
  position: number;
  labels: string[];
  timeEntries?: Array<{ id: string; startedAt: string; stoppedAt?: string; durationMinutes?: number }>;
}

interface Column {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

interface Props {
  column: Column;
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
}

export default function KanbanColumn({ column, onAddTask, onTaskClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const sortedTasks = [...(column.tasks || [])].sort((a, b) => a.position - b.position);

  return (
    <div
      className={`flex flex-col w-[280px] min-w-[280px] bg-white rounded-lg border border-border transition-all duration-200
        ${isOver ? 'bg-accent-soft outline-2 outline-dashed outline-accent/30 -outline-offset-4' : ''}`}
      style={{ borderRadius: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.5px] text-text-muted">
            {column.name}
          </h3>
          <span className="text-[11px] font-medium bg-bg rounded-pill px-2 py-0.5 text-text-dim">
            {sortedTasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="w-7 h-7 rounded-full flex items-center justify-center text-text-dim hover:bg-accent-soft hover:text-accent transition-all duration-200"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Body */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[60px]"
      >
        <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
