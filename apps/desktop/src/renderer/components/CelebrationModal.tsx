import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

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

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      {/* Fireworks background */}
      <div className="absolute inset-0 bg-black/60 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="firework-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random() * 2}s`,
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'][Math.floor(Math.random() * 6)],
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-300 hover:text-gray-500">
          <X size={20} />
        </button>

        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{message}</h2>
        <p className="text-gray-500 mb-6">"{task.title}" is done!</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          {task.projectedDurationMinutes && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated</span>
              <span className="font-medium">{formatMinutes(task.projectedDurationMinutes)}</span>
            </div>
          )}
          {task.executedDurationMinutes > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Actual</span>
              <span className="font-medium">{formatMinutes(task.executedDurationMinutes)}</span>
            </div>
          )}
          {accuracy !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Accuracy</span>
              <span className={`font-medium ${accuracy > 120 ? 'text-red-500' : accuracy < 80 ? 'text-blue-500' : 'text-green-500'}`}>
                {accuracy}%
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Keep Going!
        </button>
      </div>
    </div>
  );
}
