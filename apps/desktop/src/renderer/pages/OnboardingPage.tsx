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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full ${step >= s ? 'bg-primary-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2">Welcome to Smart Todo</h2>
            <p className="text-gray-500 text-center mb-6">
              Tell us about your skills so we can personalize task estimates.
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="e.g., Senior full-stack developer, 8 years experience. TypeScript, React, Node.js, Python, AWS..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleGenerateAndNext}
                disabled={generating}
                className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {generating ? 'Saving...' : 'Next'}
              </button>
              <button
                onClick={() => setStep(2)}
                className="py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2">Set Your Availability</h2>
            <p className="text-gray-500 text-center mb-6">
              When are you available during the day? This helps plan realistic schedules.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="time"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Until</label>
                <input
                  type="time"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full mt-6 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Finishing...' : 'Get Started'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
