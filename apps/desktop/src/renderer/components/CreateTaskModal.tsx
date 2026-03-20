import { useState } from 'react';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-2 rounded text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent h-20 resize-none"
              placeholder="Optional details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
              <select
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {columns.sort((a, b) => a.position - b.position).map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

          {/* AI Estimation */}
          {estimation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800">
                AI Estimate: {estimation.projectedDurationMinutes < 60
                  ? `${estimation.projectedDurationMinutes}min`
                  : `${Math.floor(estimation.projectedDurationMinutes / 60)}h ${estimation.projectedDurationMinutes % 60}m`}
              </p>
              <p className="text-xs text-blue-600 mt-1">{estimation.reasoning}</p>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handleEstimate}
              disabled={estimating || !title.trim()}
              className="px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              {estimating ? 'Estimating...' : 'AI Estimate'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
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
