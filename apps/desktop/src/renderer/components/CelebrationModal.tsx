import { useEffect, useState } from 'react';
import { formatMinutes } from '../utils/format';

interface Task {
  id: string;
  title: string;
  projectedDurationMinutes?: number;
  executedDurationMinutes: number;
}

interface Props {
  task: Task;
  onClose: () => void;
}

const messages = [
  "You crushed it!",
  "Task complete! Well done!",
  "Another one bites the dust!",
  "Nailed it!",
  "That's how it's done!",
  "Mission accomplished!",
  "You're on fire!",
  "Boom! Done!",
  "One less thing to worry about!",
  "Shipped it!",
];

export default function CelebrationModal({ task, onClose }: Props) {
  const [message] = useState(() => messages[Math.floor(Math.random() * messages.length)]);

  useEffect(() => {
    const timeout = setTimeout(onClose, 8000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  const accuracy = task.projectedDurationMinutes && task.executedDurationMinutes > 0
    ? Math.round((task.executedDurationMinutes / task.projectedDurationMinutes) * 100)
    : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(30,27,58,0.3)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-[480px] mx-4 rounded-[28px] text-center border border-border"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F7F5FF 100%)',
          boxShadow: '0 0 60px rgba(124,92,252,0.12), 0 20px 60px rgba(0,0,0,0.08)',
          padding: '48px 56px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Emoji with bounce */}
        <div className="text-[64px] mb-4 animate-bounce">
          🎉
        </div>

        {/* Title with gradient */}
        <h2
          className="text-[28px] font-extrabold mb-3"
          style={{
            background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {message}
        </h2>

        {/* Task name */}
        <p className="text-[16px] font-semibold text-success mb-8">
          "{task.title}" is done!
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {task.projectedDurationMinutes && (
            <div className="text-center">
              <div className="text-[20px] font-extrabold text-text">{formatMinutes(task.projectedDurationMinutes)}</div>
              <div className="text-[11px] text-text-muted mt-0.5">Estimated</div>
            </div>
          )}
          {task.executedDurationMinutes > 0 && (
            <div className="text-center">
              <div className="text-[20px] font-extrabold text-text">{formatMinutes(task.executedDurationMinutes)}</div>
              <div className="text-[11px] text-text-muted mt-0.5">Actual</div>
            </div>
          )}
          {accuracy !== null && (
            <div className="text-center">
              <div className={`text-[20px] font-extrabold ${accuracy > 120 ? 'text-danger' : accuracy < 80 ? 'text-accent' : 'text-success'}`}>
                {accuracy}%
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">Accuracy</div>
            </div>
          )}
        </div>

        {/* Button */}
        <button
          onClick={onClose}
          className="btn-primary px-10 py-3 text-[15px] font-bold"
        >
          Keep Going!
        </button>
      </div>
    </div>
  );
}
