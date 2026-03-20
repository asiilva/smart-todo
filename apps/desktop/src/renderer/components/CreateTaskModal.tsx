import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '../services/api-client';

interface Column {
  id: string;
  name: string;
  position: number;
}

interface Props {
  boardId: string;
  columnId?: string;
  columns: Column[];
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTaskModal({ boardId, columnId, columns, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('work');
  const [selectedColumnId, setSelectedColumnId] = useState(columnId || columns[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimation, setEstimation] = useState<{ projectedDurationMinutes: number; reasoning: string } | null>(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Array<{id: string; name: string; color: string}>>([]);

  useEffect(() => {
    apiClient.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const handleEstimate = async () => {
    if (!title.trim()) return;
    setEstimating(true);
    try {
      // Fetch user's tech profile for personalized estimation
      let userProfile = '';
      try {
        const profileRes = await apiClient.get('/users/me/profile');
        const profile = profileRes.data;
        userProfile = profile.rawText || JSON.stringify(profile.structuredProfile || {});
      } catch {
        // No profile yet — estimate without it
      }

      // Fetch recent completed tasks for historical accuracy
      let history = '';
      try {
        const historyRes = await apiClient.get('/reports/completed?period=month&date=' + new Date().toISOString().split('T')[0]);
        const tasks = historyRes.data?.tasks || [];
        const relevant = tasks.slice(0, 10).map((t: { title: string; projectedDurationMinutes?: number; executedDurationMinutes: number }) =>
          `"${t.title}": projected ${t.projectedDurationMinutes || '?'}min, actual ${t.executedDurationMinutes}min`
        );
        if (relevant.length > 0) history = relevant.join('\n');
      } catch {
        // No history yet
      }

      const result = await window.electronAPI.estimateTask({
        taskTitle: title,
        taskDescription: description,
        userProfile,
        history,
      });
      if (result.success && result.data) {
        setEstimation(result.data);
        if (result.data.suggestedPriority) setPriority(result.data.suggestedPriority);
        if (result.data.suggestedCategory) setCategory(result.data.suggestedCategory);
      }
    } catch {
      // Non-blocking
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      await apiClient.post(`/boards/${boardId}/tasks`, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        columnId: selectedColumnId,
        projectedDurationMinutes: estimation?.projectedDurationMinutes,
        scheduledDate: scheduledDate || undefined,
      });
      onCreated();
    } catch (err) {
      setError('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(30,27,58,0.3)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] rounded-[22px] w-full max-w-[480px] mx-4 border border-border"
        style={{ boxShadow: '0 8px 40px rgba(124,92,252,0.1), 0 20px 60px rgba(0,0,0,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[18px] font-bold text-text">New Task</h2>
          <button
            onClick={onClose}
            className="w-[34px] h-[34px] rounded-full bg-bg hover:bg-danger/10 hover:text-danger flex items-center justify-center transition-colors text-text-muted"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="bg-danger/10 text-danger p-3 rounded-[10px] text-sm font-medium">{error}</div>
          )}

          <div>
            <label className="form-label">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input h-20 resize-none"
              placeholder="Optional details..."
            />
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Column</label>
              <select
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
                className="form-input"
              >
                {columns.sort((a, b) => a.position - b.position).map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
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

          {/* AI Estimation Result */}
          {estimation && (
            <div className="bg-accent-soft border border-accent/20 rounded-[14px] p-4">
              <p className="text-sm font-semibold text-accent">
                AI Estimate: {estimation.projectedDurationMinutes < 60
                  ? `${estimation.projectedDurationMinutes}min`
                  : `${Math.floor(estimation.projectedDurationMinutes / 60)}h ${estimation.projectedDurationMinutes % 60}m`}
              </p>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{estimation.reasoning}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleEstimate}
              disabled={estimating || !title.trim()}
              className="btn-secondary"
            >
              {estimating ? 'Estimating...' : 'AI Estimate'}
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
