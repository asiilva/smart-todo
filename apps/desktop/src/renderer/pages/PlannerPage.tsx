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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); };
  const today = () => setDate(new Date());
  const isToday = formatDate(date) === formatDate(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  // Calculate timeline data
  const startHour = plan ? parseInt(plan.settings.availableFrom.split(':')[0]) : 7;
  const endHour = plan ? parseInt(plan.settings.availableUntil.split(':')[0]) : 22;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const SLOT_HEIGHT = 60;

  // Position tasks sequentially on the timeline
  const taskBlocks: Array<{ task: Task; top: number; height: number }> = [];
  if (plan) {
    let currentMinute = timeToMinutes(plan.settings.availableFrom);
    for (const task of plan.tasks) {
      const duration = task.projectedDurationMinutes || 30;
      const top = ((currentMinute - startHour * 60) / 60) * SLOT_HEIGHT;
      const height = (duration / 60) * SLOT_HEIGHT;
      taskBlocks.push({ task, top, height: Math.max(height, 24) });
      currentMinute += duration;
    }
  }

  // Position protected blocks
  const protectedBlockPositions: Array<{ block: ProtectedBlock; top: number; height: number }> = [];
  if (plan) {
    for (const block of plan.protectedBlocks) {
      const blockStart = timeToMinutes(block.startTime);
      const blockEnd = timeToMinutes(block.endTime);
      const top = ((blockStart - startHour * 60) / 60) * SLOT_HEIGHT;
      const height = ((blockEnd - blockStart) / 60) * SLOT_HEIGHT;
      protectedBlockPositions.push({ block, top, height: Math.max(height, 24) });
    }
  }

  return (
    <div className="flex h-full">
      {/* LEFT: Timeline */}
      <div className="flex-1 overflow-y-auto p-5 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-text">{formatDisplayDate(date)}</h1>
            <p className="text-[13px] text-text-muted mt-0.5">
              {plan ? `${plan.tasks.length} tasks · ${formatMinutes(plan.summary.totalProjectedMinutes)} planned` : 'No data'}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={prevDay} className="btn-secondary px-3 py-1.5 text-xs">
              <ChevronLeft size={14} />
            </button>
            {!isToday && (
              <button onClick={today} className="btn-primary px-4 py-1.5 text-xs">
                Today
              </button>
            )}
            <button onClick={nextDay} className="btn-secondary px-3 py-1.5 text-xs">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Timeline */}
        {plan && (
          <div className="relative ml-[60px]" style={{ borderLeft: '2px solid #E8E5F5' }}>
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: SLOT_HEIGHT, borderBottom: '1px dashed #E8E5F5' }}>
                <span className="absolute text-[11px] text-text-dim w-[50px] text-right"
                  style={{ left: -60, top: -8 }}>
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}

            {/* Task blocks */}
            {taskBlocks.map(({ task, top, height }) => (
              <div
                key={task.id}
                className="absolute left-3 right-3 rounded-[14px] px-3.5 py-2 text-white text-xs font-semibold flex items-center justify-between overflow-hidden z-[2]"
                style={{
                  top,
                  height,
                  backgroundColor: categoryColors[task.category] || '#6B6894',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
              >
                <span className="truncate">{task.title}</span>
                <span className="text-[10px] opacity-80 font-normal shrink-0 ml-2">
                  {formatMinutes(task.projectedDurationMinutes || 0)}
                </span>
              </div>
            ))}

            {/* Protected blocks */}
            {protectedBlockPositions.map(({ block, top, height }) => (
              <div
                key={block.id}
                className="absolute left-3 right-3 rounded-[14px] px-3.5 py-2 text-white text-xs font-semibold flex items-center justify-between overflow-hidden z-[1] opacity-85"
                style={{
                  top,
                  height,
                  backgroundColor: categoryColors[block.category] || '#8B8BA8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)',
                }}
              >
                <span className="truncate">{block.title}</span>
                <span className="text-[10px] opacity-80 font-normal shrink-0 ml-2">
                  {block.startTime}–{block.endTime}
                </span>
              </div>
            ))}
          </div>
        )}

        {!plan && (
          <div className="text-center text-text-muted py-12">
            <p>Could not load plan for this day.</p>
            <button onClick={loadPlan} className="mt-2 text-accent hover:underline text-sm">Retry</button>
          </div>
        )}
      </div>

      {/* RIGHT: Sidebar */}
      {plan && (
        <div className="w-[320px] bg-[var(--color-surface)] border-l border-border p-5 overflow-y-auto shrink-0">
          {/* Summary */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.5px] text-text-muted mb-3">Day Summary</h3>
            <p className="text-2xl font-extrabold text-text">{formatMinutes(plan.summary.totalProjectedMinutes)}</p>
            <p className="text-[13px] text-text-muted mb-4">
              of {formatMinutes(plan.summary.availableMinutes)} available
            </p>

            {/* Progress bar */}
            <div className="h-2 bg-bg rounded-pill overflow-hidden mb-2">
              <div
                className="h-full rounded-pill transition-all duration-500"
                style={{
                  width: `${Math.min((plan.summary.totalProjectedMinutes / plan.summary.availableMinutes) * 100, 100)}%`,
                  background: plan.summary.isOverbooked
                    ? '#F0556E'
                    : 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
                }}
              />
            </div>

            {/* Category bars */}
            {Object.entries(plan.summary.categoryBreakdown).map(([cat, minutes]) => (
              <div key={cat} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-text">{cat}</span>
                  <span className="text-text-muted">{formatMinutes(minutes)}</span>
                </div>
                <div className="h-2 bg-bg rounded-pill overflow-hidden">
                  <div
                    className="h-full rounded-pill transition-all duration-500"
                    style={{
                      width: `${(minutes / plan.summary.availableMinutes) * 100}%`,
                      backgroundColor: categoryColors[cat] || '#6B6894',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Overbooked warning */}
          {plan.summary.isOverbooked && (
            <div className="rounded-[14px] p-3.5 mb-6"
              style={{ background: 'rgba(240,85,110,0.06)', border: '1px solid rgba(240,85,110,0.2)' }}>
              <p className="text-[13px] font-bold text-danger mb-1 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Overbooked
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                You have {formatMinutes(plan.summary.totalProjectedMinutes)} of work planned but only {formatMinutes(plan.summary.availableMinutes)} available.
              </p>
            </div>
          )}

          {/* Protected blocks */}
          {plan.protectedBlocks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.5px] text-text-muted mb-3">Protected Time</h3>
              {plan.protectedBlocks.map((block) => (
                <div key={block.id} className="flex items-center gap-2.5 py-2 border-b border-border">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: categoryColors[block.category] || '#8B8BA8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text truncate">{block.title}</p>
                    <p className="text-[11px] text-text-muted">{block.startTime} – {block.endTime}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Task list */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.5px] text-text-muted mb-3">
              Tasks ({plan.tasks.length})
            </h3>
            {plan.tasks.length === 0 ? (
              <p className="text-sm text-text-dim text-center py-6">No tasks scheduled</p>
            ) : (
              <div className="space-y-2">
                {plan.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2.5 py-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: categoryColors[task.category] || '#6B6894' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text truncate">{task.title}</p>
                    </div>
                    <span className="text-xs font-semibold text-text-muted shrink-0">
                      {formatMinutes(task.projectedDurationMinutes || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
