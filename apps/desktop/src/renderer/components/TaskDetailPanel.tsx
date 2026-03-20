import { useState, useEffect } from 'react';
import { X, Play, Square, Clock } from 'lucide-react';
import { apiClient } from '../services/api-client';

interface TimeEntry {
  id: string;
  startedAt: string;
  stoppedAt?: string;
  durationMinutes?: number;
}

interface Task {
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
  timeEntries?: TimeEntry[];
}

interface Props {
  task: Task;
  onClose: () => void;
  onUpdated: () => void;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TaskDetailPanel({ task, onClose, onUpdated }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [priority, setPriority] = useState(task.priority);
  const [category, setCategory] = useState(task.category);
  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate?.split('T')[0] || '');
  const [saving, setSaving] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(task.timeEntries || []);

  const activeEntry = timeEntries.find(e => !e.stoppedAt);
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

  useEffect(() => {
    loadTimeEntries();
  }, []);

  const loadTimeEntries = async () => {
    try {
      const res = await apiClient.get(`/tasks/${task.id}/time-entries`);
      setTimeEntries(res.data);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/tasks/${task.id}`, {
        title: title.trim(),
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        priority,
        category,
        scheduledDate: scheduledDate || null,
      });
      onUpdated();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      await apiClient.post(`/tasks/${task.id}/timer/start`);
      await loadTimeEntries();
    } catch {
      // ignore
    }
  };

  const handleStopTimer = async () => {
    try {
      await apiClient.post(`/tasks/${task.id}/timer/stop`);
      await loadTimeEntries();
      onUpdated();
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      onUpdated();
    } catch {
      // ignore
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Task Details</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-lg font-medium border-0 border-b border-gray-200 pb-2 focus:ring-0 focus:border-primary-500"
        />

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-20 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-16 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Links, reminders, or useful info..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="work">Work</option>
              <option value="exercise">Exercise</option>
              <option value="family">Family</option>
              <option value="personal">Personal</option>
              <option value="errand">Errand</option>
              <option value="learning">Learning</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Scheduled Date</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        {/* Time tracking */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Clock size={14} /> Time Tracking
            </h3>
            {hasActiveTimer ? (
              <button
                onClick={handleStopTimer}
                className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                <Square size={12} /> Stop
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
              >
                <Play size={12} /> Start
              </button>
            )}
          </div>

          {hasActiveTimer && elapsed && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Current session:</span>
              <span className="font-mono font-medium text-green-600">{elapsed}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Executed:</span>
            <span className="font-medium">{formatMinutes(task.executedDurationMinutes)}</span>
          </div>
          {task.projectedDurationMinutes && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Projected:</span>
              <span className="font-medium">{formatMinutes(task.projectedDurationMinutes)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t flex justify-between">
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Delete
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    </>
  );
}
