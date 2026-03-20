import { useState, useEffect } from 'react';
import { X, Play, Square, Clock } from 'lucide-react';
import { apiClient } from '../services/api-client';
import { useToastStore } from './Toast';
import { formatMinutes } from '../utils/format';

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

export default function TaskDetailPanel({ task, onClose, onUpdated }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [priority, setPriority] = useState(task.priority);
  const [category, setCategory] = useState(task.category);
  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate?.split('T')[0] || '');
  const [saving, setSaving] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(task.timeEntries || []);
  const [categories, setCategories] = useState<Array<{id: string; name: string; color: string}>>([]);

  useEffect(() => {
    apiClient.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

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
      useToastStore.getState().addToast('Failed to save task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      await apiClient.post(`/tasks/${task.id}/timer/start`);
      await loadTimeEntries();
    } catch {
      useToastStore.getState().addToast('Failed to start timer', 'error');
    }
  };

  const handleStopTimer = async () => {
    try {
      await apiClient.post(`/tasks/${task.id}/timer/stop`);
      await loadTimeEntries();
      onUpdated();
    } catch {
      useToastStore.getState().addToast('Failed to stop timer', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      onUpdated();
    } catch {
      useToastStore.getState().addToast('Failed to delete task', 'error');
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div className="fixed inset-y-0 right-0 w-[400px] bg-[var(--color-surface)] shadow z-50 flex flex-col border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-[14px] font-bold text-text-muted uppercase tracking-wide">Task Details</h2>
        <button
          onClick={onClose}
          className="w-[34px] h-[34px] rounded-full bg-bg hover:bg-danger/10 hover:text-danger flex items-center justify-center transition-colors text-text-muted"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-bold bg-transparent border-0 border-b border-border pb-2 w-full focus:border-accent focus:outline-none transition-colors"
          style={{ boxShadow: 'none' }}
          onFocus={(e) => e.target.style.boxShadow = '0 2px 0 0 #7C5CFC'}
          onBlur={(e) => e.target.style.boxShadow = 'none'}
        />

        <div>
          <label className="form-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input h-20 resize-none"
          />
        </div>

        <div>
          <label className="form-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input h-16 resize-none"
            placeholder="Links, reminders, or useful info..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="form-input"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="form-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input"
            >
              {categories.length > 0 ? categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              )) : (
                <>
                  <option value="work">Work</option>
                  <option value="exercise">Exercise</option>
                  <option value="family">Family</option>
                  <option value="personal">Personal</option>
                  <option value="errand">Errand</option>
                  <option value="learning">Learning</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Scheduled Date</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Time Tracking */}
        <div className="bg-bg rounded-[14px] p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Clock size={14} className="text-text-muted" /> Time Tracking
            </h3>
            {hasActiveTimer ? (
              <button
                onClick={handleStopTimer}
                className="w-[30px] h-[30px] rounded-full bg-danger/10 text-danger hover:bg-danger/20 flex items-center justify-center transition-colors"
              >
                <Square size={12} />
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                className="w-[30px] h-[30px] rounded-full bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors"
              >
                <Play size={12} />
              </button>
            )}
          </div>

          {hasActiveTimer && elapsed && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-text-muted">Current session</span>
              <span className="font-mono font-bold text-success">{elapsed}</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[20px] font-extrabold text-text">{formatMinutes(task.executedDurationMinutes)}</div>
              <div className="text-[11px] text-text-muted">Executed</div>
            </div>
            {task.projectedDurationMinutes && (
              <div className="flex-1">
                <div className="text-[20px] font-extrabold text-text">{formatMinutes(task.projectedDurationMinutes)}</div>
                <div className="text-[11px] text-text-muted">Projected</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <button
          onClick={handleDelete}
          className="btn-danger"
        >
          Delete
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    </>
  );
}
