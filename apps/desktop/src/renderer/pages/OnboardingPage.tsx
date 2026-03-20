import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api-client';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState('');
  const [availableFrom, setAvailableFrom] = useState('07:00');
  const [availableUntil, setAvailableUntil] = useState('22:00');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleGenerateAndNext = async () => {
    if (rawText.trim()) {
      setGenerating(true);
      try {
        await apiClient.post('/users/me/profile', { rawText });
        await window.electronAPI.generateProfile({ resumeText: rawText });
      } catch {
        // Non-blocking — profile can be refined later
      } finally {
        setGenerating(false);
      }
    }
    setStep(2);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiClient.put('/planner/settings', { availableFrom, availableUntil });
    } catch {
      // Non-blocking
    }
    setSaving(false);
    navigate('/board');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="max-w-lg w-full bg-[var(--color-surface)] rounded-xl shadow p-9 border border-border">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${step >= s ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="text-[22px] font-bold text-text text-center mb-2">Welcome to Smart Todo</h2>
            <p className="text-text-muted text-center mb-6 text-[14px]">
              Tell us about your skills so we can personalize task estimates.
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="form-input h-40 resize-none"
              placeholder="e.g., Senior full-stack developer, 8 years experience. TypeScript, React, Node.js, Python, AWS..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleGenerateAndNext}
                disabled={generating}
                className="btn-primary flex-1"
              >
                {generating ? 'Saving...' : 'Next'}
              </button>
              <button
                onClick={() => setStep(2)}
                className="py-2 px-4 text-text-muted hover:text-text transition-colors text-[14px] font-medium"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-[22px] font-bold text-text text-center mb-2">Set Your Availability</h2>
            <p className="text-text-muted text-center mb-6 text-[14px]">
              When are you available during the day? This helps plan realistic schedules.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">From</label>
                <input
                  type="time"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Until</label>
                <input
                  type="time"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="btn-primary w-full mt-6"
            >
              {saving ? 'Finishing...' : 'Get Started'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
