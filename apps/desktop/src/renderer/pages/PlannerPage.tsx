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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Date navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="btn-secondary !px-2.5 !py-1.5">
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-[20px] font-bold text-text">{formatDisplayDate(date)}</h1>
          <button onClick={nextDay} className="btn-secondary !px-2.5 !py-1.5">
            <ChevronRight size={18} />
          </button>
        </div>
        {!isToday && (
          <button onClick={today} className="btn-primary">
            Today
          </button>
        )}
      </div>

      {plan && (
        <>
          {/* Overbooked warning */}
          {plan.summary.isOverbooked && (
            <div
              className="rounded-[14px] p-3.5 mb-4 flex items-center gap-2.5"
              style={{
                background: 'rgba(240,85,110,0.06)',
                border: '1px solid rgba(240,85,110,0.2)',
              }}
            >
              <AlertTriangle size={18} className="text-danger flex-shrink-0" />
              <span className="text-[13px] text-danger">
                Day is overbooked! {formatMinutes(plan.summary.totalProjectedMinutes)} projected vs {formatMinutes(plan.summary.availableMinutes)} available.
              </span>
            </div>
          )}

          {/* Summary bar */}
          <div className="bg-white rounded-[16px] border border-border p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12px] font-bold uppercase tracking-wide text-text-muted">Day Summary</h2>
              <span className="text-[13px] text-text-muted">
                {formatMinutes(plan.summary.totalProjectedMinutes)} / {formatMinutes(plan.summary.availableMinutes)} available
              </span>
            </div>

            {/* Category breakdown bar */}
            <div className="h-2 bg-bg rounded-pill overflow-hidden flex">
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
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: categoryColors[cat] || '#6B7280' }}
                  />
                  <span className="text-[12px] text-text-muted">{cat}: {formatMinutes(minutes)}</span>
                </div>
              ))}
              {plan.summary.availableMinutes > plan.summary.totalProjectedMinutes && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-bg" />
                  <span className="text-[12px] text-text-muted">
                    free: {formatMinutes(plan.summary.availableMinutes - plan.summary.totalProjectedMinutes)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Protected blocks */}
          {plan.protectedBlocks.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[12px] font-bold uppercase tracking-wide text-text-muted mb-3">Protected Time</h2>
              <div className="space-y-0">
                {plan.protectedBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-dashed border-border"
                  >
                    <span className="text-[13px] font-medium text-text-dim w-28">
                      {block.startTime} – {block.endTime}
                    </span>
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColors[block.category] || '#6B7280' }}
                    />
                    <span className="text-[13px] text-text">{block.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks list */}
          <div>
            <h2 className="text-[12px] font-bold uppercase tracking-wide text-text-muted mb-3">
              Tasks ({plan.tasks.length})
            </h2>
            {plan.tasks.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-[14px] p-12 text-center text-text-dim">
                No tasks scheduled for this day.
              </div>
            ) : (
              <div className="space-y-2">
                {plan.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-white border border-border rounded-[14px] px-5 py-3.5 transition-all duration-200 hover:shadow-card hover:-translate-y-px cursor-default"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColors[task.category] || '#6B7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-text truncate">{task.title}</p>
                      <p className="text-[11px] text-text-dim">{task.category} · {task.priority}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {task.projectedDurationMinutes && (
                        <p className="text-[13px] font-semibold text-text">
                          {formatMinutes(task.projectedDurationMinutes)}
                        </p>
                      )}
                      {task.executedDurationMinutes > 0 && (
                        <p className="text-[11px] text-text-dim">
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
        <div className="border-2 border-dashed border-border rounded-[14px] p-12 text-center text-text-dim">
          <p>Could not load plan for this day.</p>
          <button onClick={loadPlan} className="mt-2 text-accent hover:text-accent-hover text-sm font-medium">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
