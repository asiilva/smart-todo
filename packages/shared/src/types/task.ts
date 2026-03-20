export interface Task {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  notes?: string;
  projectedDurationMinutes?: number;
  executedDurationMinutes: number;
  priority: TaskPriority;
  category: string;
  position: number;
  labels: string[];
  scheduledDate?: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CreateTaskRequest {
  title: string;
  description?: string;
  notes?: string;
  projectedDurationMinutes?: number;
  priority?: TaskPriority;
  category?: string;
  columnId?: string;
  labels?: string[];
  scheduledDate?: string;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  notes?: string;
  projectedDurationMinutes?: number;
  priority?: TaskPriority;
  category?: string;
  labels?: string[];
  scheduledDate?: string;
  dueDate?: string;
}

export interface MoveTaskRequest {
  columnId: string;
  position: number;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  stoppedAt?: string;
  durationMinutes?: number;
}
