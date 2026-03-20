import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { apiClient } from '../services/api-client';
import { formatMinutes, categoryColors } from '../utils/format';

interface Task {
  id: string;
  title: string;
  projectedDurationMinutes?: number;
  executedDurationMinutes: number;
  category: string;
  priority: string;
}

interface ProtectedBlock {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
}

interface DailySettings {
  availableFrom: string;
  availableUntil: string;
}

interface DaySummary {
  totalProjectedMinutes: number;
  totalExecutedMinutes: number;
  availableMinutes: number;
  categoryBreakdown: Record<string, number>;
  isOverbooked: boolean;
}

interface DayPlan {
  tasks: Task[];
  protectedBlocks: ProtectedBlock[];
  settings: DailySettings;
  summary: DaySummary;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PlannerPage() {
  const [date, setDate] = useState(new Date());
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, [date]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/planner/${formatDate(date)}`);
      setPlan(res.data);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d);
  };

  const today = () => setDate(new Date());

  const isToday = formatDate(date) === formatDate(new Date());

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Date navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">{formatDisplayDate(date)}</h1>
          <button onClick={nextDay} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={20} />
          </button>
        </div>
        {!isToday && (
          <button onClick={today} className="text-sm text-primary-600 hover:underline">
            Today
          </button>
        )}
      </div>

      {plan && (
        <>
          {/* Overbooked warning */}
          {plan.summary.isOverbooked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="text-sm text-red-700">
                Day is overbooked! {formatMinutes(plan.summary.totalProjectedMinutes)} projected vs {formatMinutes(plan.summary.availableMinutes)} available.
              </span>
            </div>
          )}

          {/* Summary bar */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Day Summary</h2>
              <span className="text-sm text-gray-500">
                {formatMinutes(plan.summary.totalProjectedMinutes)} / {formatMinutes(plan.summary.availableMinutes)} available
              </span>
            </div>

            {/* Category breakdown bar */}
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
              {Object.entries(plan.summary.categoryBreakdown).map(([cat, minutes]) => (
                <div
                  key={cat}
                  style={{
                    width: `${(minutes / plan.summary.availableMinutes) * 100}%`,
                    backgroundColor: categoryColors[cat] || '#6B7280',
                  }}
                  className="h-full"
                  title={`${cat}: ${formatMinutes(minutes)}`}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3">
              {Object.entries(plan.summary.categoryBreakdown).map(([cat, minutes]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryColors[cat] || '#6B7280' }}
                  />
                  <span className="text-xs text-gray-600">{cat}: {formatMinutes(minutes)}</span>
                </div>
              ))}
              {plan.summary.availableMinutes > plan.summary.totalProjectedMinutes && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                  <span className="text-xs text-gray-600">
                    free: {formatMinutes(plan.summary.availableMinutes - plan.summary.totalProjectedMinutes)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Protected blocks */}
          {plan.protectedBlocks.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Protected Time</h2>
              <div className="space-y-2">
                {plan.protectedBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg px-4 py-2"
                  >
                    <span className="text-sm font-medium text-gray-500 w-28">
                      {block.startTime} – {block.endTime}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: categoryColors[block.category] || '#6B7280' }}
                    />
                    <span className="text-sm text-gray-700">{block.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks list */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Tasks ({plan.tasks.length})
            </h2>
            {plan.tasks.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                No tasks scheduled for this day.
              </div>
            ) : (
              <div className="space-y-2">
                {plan.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-white border rounded-lg px-4 py-3"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColors[task.category] || '#6B7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400">{task.category} · {task.priority}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {task.projectedDurationMinutes && (
                        <p className="text-sm font-medium text-gray-600">
                          {formatMinutes(task.projectedDurationMinutes)}
                        </p>
                      )}
                      {task.executedDurationMinutes > 0 && (
                        <p className="text-xs text-gray-400">
                          {formatMinutes(task.executedDurationMinutes)} done
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!plan && (
        <div className="text-center text-gray-500 py-12">
          <p>Could not load plan for this day.</p>
          <button onClick={loadPlan} className="mt-2 text-primary-600 hover:underline text-sm">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
