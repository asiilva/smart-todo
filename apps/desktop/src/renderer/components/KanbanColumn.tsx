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

const columnColors: Record<string, string> = {
  'Backlog': 'border-gray-300',
  'To Do': 'border-blue-300',
  'In Progress': 'border-yellow-300',
  'Review': 'border-purple-300',
  'Done': 'border-green-300',
};

export default function KanbanColumn({ column, onAddTask, onTaskClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const sortedTasks = [...column.tasks].sort((a, b) => a.position - b.position);

  return (
    <div
      className={`flex flex-col w-72 min-w-[18rem] bg-gray-100 rounded-lg border-t-2 ${columnColors[column.name] || 'border-gray-300'} ${isOver ? 'bg-blue-50' : ''}`}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-700">{column.name}</h3>
          <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]"
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
