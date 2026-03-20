import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCorners, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api-client';
import KanbanColumn from '../components/KanbanColumn';
import TaskCard from '../components/TaskCard';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailPanel from '../components/TaskDetailPanel';
import CelebrationModal from '../components/CelebrationModal';
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
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
  timeEntries?: Array<{ id: string; startedAt: string; stoppedAt?: string; durationMinutes?: number }>;
}

interface Column {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

interface Board {
  id: string;
  name: string;
  columns: Column[];
}

// Tech profile requirement expires 2026-06-19 (3 months from launch)
const PROFILE_REQUIRED_UNTIL = new Date('2026-06-19');

export default function BoardPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [createColumnId, setCreateColumnId] = useState<string | undefined>();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [celebrationTask, setCelebrationTask] = useState<Task | null>(null);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    loadBoard();
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      await apiClient.get('/users/me/profile');
      setHasProfile(true);
    } catch {
      setHasProfile(false);
    }
  };

  const isProfileRequired = () => {
    return !hasProfile && new Date() < PROFILE_REQUIRED_UNTIL;
  };

  const handleNewTask = (columnId?: string) => {
    if (isProfileRequired()) {
      setShowProfilePrompt(true);
      return;
    }
    setCreateColumnId(columnId);
    setShowCreateModal(true);
  };

  const loadBoard = async () => {
    try {
      const res = await apiClient.get('/boards');
      const boards = res.data;
      if (boards.length > 0) {
        const boardRes = await apiClient.get(`/boards/${boards[0].id}`);
        setBoard(boardRes.data);
      } else {
        // Create default board
        const createRes = await apiClient.post('/boards', { name: 'My Board' });
        setBoard(createRes.data);
      }
    } catch (err) {
      console.error('Failed to load board', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTask(event.active.id as string);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !board) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Determine target column and position
    let targetColumnId: string;
    let targetPosition: number;

    const overColumn = board.columns.find(c => c.id === overId);
    if (overColumn) {
      targetColumnId = overColumn.id;
      targetPosition = overColumn.tasks.length;
    } else {
      const overTask = findTask(overId);
      if (!overTask) return;
      targetColumnId = overTask.columnId;
      targetPosition = overTask.position;
    }

    try {
      await apiClient.patch(`/tasks/${taskId}/move`, {
        columnId: targetColumnId,
        position: targetPosition,
      });

      // Auto-start/stop timer based on target column
      const targetColumn = board.columns.find(c => c.id === targetColumnId);
      if (targetColumn) {
        if (targetColumn.name === 'In Progress') {
          try {
            await apiClient.post(`/tasks/${taskId}/timer/start`);
          } catch (timerErr) {
            console.error('Failed to auto-start timer', timerErr);
          }
        } else if (targetColumn.name === 'Done') {
          try {
            await apiClient.post(`/tasks/${taskId}/timer/stop`);
          } catch (timerErr) {
            console.error('Failed to auto-stop timer', timerErr);
          }
          const task = findTask(taskId);
          if (task) {
            setCelebrationTask(task);
          }
        }
      }

      await loadBoard();
    } catch (err) {
      console.error('Failed to move task', err);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by dnd-kit
  };

  const findTask = (id: string): Task | undefined => {
    if (!board) return undefined;
    for (const col of board.columns) {
      const task = col.tasks.find(t => t.id === id);
      if (task) return task;
    }
    return undefined;
  };

  const handleTaskCreated = () => {
    setShowCreateModal(false);
    loadBoard();
  };

  const handleTaskUpdated = () => {
    setSelectedTask(null);
    loadBoard();
  };

  const handleCreateInColumn = (columnId: string) => {
    handleNewTask(columnId);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No board found. Something went wrong.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">{board.name}</h1>
        <button
          onClick={() => handleNewTask()}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {board.columns
              .sort((a, b) => a.position - b.position)
              .map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  onAddTask={() => handleCreateInColumn(column.id)}
                  onTaskClick={(task) => setSelectedTask(task)}
                />
              ))}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {showCreateModal && board && (
        <CreateTaskModal
          boardId={board.id}
          columnId={createColumnId}
          columns={board.columns}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTaskCreated}
        />
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}

      {showProfilePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-2">Set Up Your Tech Profile First</h2>
            <p className="text-gray-500 text-sm mb-4">
              To create accurate time estimates, Smart Todo needs to know your skills and experience.
              Please fill out your tech profile before creating your first task.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowProfilePrompt(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowProfilePrompt(false); navigate('/profile'); }}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {celebrationTask && (
        <CelebrationModal
          task={celebrationTask}
          onClose={() => setCelebrationTask(null)}
        />
      )}
    </div>
  );
}
