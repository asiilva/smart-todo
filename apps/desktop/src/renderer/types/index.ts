export interface Task {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  notes?: string;
  projectedDurationMinutes?: number;
  executedDurationMinutes: number;
  priority: string;
  category: string;
  position: number;
  labels: string[];
  scheduledDate?: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  timeEntries?: TimeEntry[];
}

export interface TimeEntry {
  id: string;
  taskId?: string;
  userId?: string;
  startedAt: string;
  stoppedAt?: string;
  durationMinutes?: number;
}

export interface Column {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  columns: Column[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}
