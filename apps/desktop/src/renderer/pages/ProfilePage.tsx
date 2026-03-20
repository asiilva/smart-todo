import { useState, useEffect } from 'react';
import { apiClient } from '../services/api-client';
import { useToastStore } from '../components/Toast';

interface SkillEntry {
  name: string;
  proficiency: string;
}

interface StructuredProfile {
  languages: SkillEntry[];
  frameworks: SkillEntry[];
  domains: string[];
  yearsOfExperience: number;
}

interface TechProfile {
  id: string;
  rawText: string;
  structuredProfile: StructuredProfile;
}

const proficiencyColors: Record<string, string> = {
  beginner: 'bg-bg text-text-dim',
  intermediate: 'bg-accent-soft text-accent',
  senior: 'bg-success/10 text-success',
  expert: 'bg-accent/10 text-accent font-bold',
};

export default function ProfilePage() {
  const [rawText, setRawText] = useState('');
  const [profile, setProfile] = useState<TechProfile | null>(null);
  const [structuredProfile, setStructuredProfile] = useState<StructuredProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null);
  const [availableFrom, setAvailableFrom] = useState('07:00');
  const [availableUntil, setAvailableUntil] = useState('22:00');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadProfile();
    loadDailySettings();
    checkClaude();
  }, []);

  const checkClaude = async () => {
    const available = await window.electronAPI.checkClaudeAvailable();
    setClaudeAvailable(available);
  };

  const loadDailySettings = async () => {
    try {
      const res = await apiClient.get(`/planner/${new Date().toISOString().split('T')[0]}`);
      if (res.data?.settings) {
        setAvailableFrom(res.data.settings.availableFrom);
        setAvailableUntil(res.data.settings.availableUntil);
      }
    } catch {
      // Use defaults
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setError('');
    try {
      await apiClient.put('/planner/settings', { availableFrom, availableUntil });
    } catch {
      setError('Failed to save availability settings');
      useToastStore.getState().addToast('Failed to save availability settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/users/me/profile');
      setProfile(res.data);
      setRawText(res.data.rawText || '');
      if (res.data.structuredProfile && Object.keys(res.data.structuredProfile).length > 0) {
        setStructuredProfile(res.data.structuredProfile);
      }
    } catch {
      // No profile yet, that's ok
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.post('/users/me/profile', { rawText });
      setProfile(res.data);
    } catch (err) {
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!rawText.trim()) {
      setError('Please enter a skills description first');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const result = await window.electronAPI.generateProfile({ resumeText: rawText });
      if (result.success && result.data) {
        setStructuredProfile(result.data);
        // Persist both rawText and structured profile to API
        await apiClient.post('/users/me/profile', { rawText, structuredProfile: result.data });
      } else {
        setError(result.error || 'Failed to generate profile');
      }
    } catch (err) {
      setError('Failed to generate profile via Claude CLI');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-[20px] font-bold text-text mb-6">Tech Profile</h1>

      {claudeAvailable === false && (
        <div className="bg-warning/10 border border-warning/20 rounded-[14px] p-4 mb-6">
          <p className="font-semibold text-[14px] text-text">Claude CLI not detected</p>
          <p className="text-[13px] text-text-muted mt-1">
            Install Claude Code CLI to enable AI-powered profile generation.
            You can still save your profile manually.
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-[14px] px-4 py-3 mb-4 text-[13px] text-danger"
          style={{
            background: 'rgba(240,85,110,0.08)',
            border: '1px solid rgba(240,85,110,0.2)',
          }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div>
          <label className="form-label mb-2">
            Describe your skills and experience
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="form-input h-64 resize-none"
            placeholder="e.g., I'm a senior full-stack developer with 8 years of experience. Proficient in TypeScript, React, Node.js, Python. Experience with AWS, Docker, PostgreSQL. Domain expertise in fintech and e-commerce."
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            {claudeAvailable !== false && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-5 py-2.5 text-sm font-semibold rounded-pill border-0 cursor-pointer text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-text hover:bg-text/90"
              >
                {generating ? 'Generating...' : 'Generate AI Profile'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Structured profile */}
        <div>
          {structuredProfile ? (
            <div className="space-y-4">
              <div className="bg-white rounded-[14px] border border-border p-5">
                <h3 className="text-[14px] font-semibold text-text-muted mb-2">Experience</h3>
                <p className="text-[24px] font-extrabold text-accent">
                  {structuredProfile.yearsOfExperience} years
                </p>
              </div>

              {structuredProfile.languages.length > 0 && (
                <div className="bg-white rounded-[14px] border border-border p-5">
                  <h3 className="text-[14px] font-semibold text-text-muted mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {structuredProfile.languages.map((lang) => (
                      <span
                        key={lang.name}
                        className={`px-3 py-1 rounded-pill text-[12px] font-medium ${proficiencyColors[lang.proficiency] || 'bg-bg text-text-dim'}`}
                      >
                        {lang.name} · {lang.proficiency}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {structuredProfile.frameworks.length > 0 && (
                <div className="bg-white rounded-[14px] border border-border p-5">
                  <h3 className="text-[14px] font-semibold text-text-muted mb-2">Frameworks</h3>
                  <div className="flex flex-wrap gap-2">
                    {structuredProfile.frameworks.map((fw) => (
                      <span
                        key={fw.name}
                        className={`px-3 py-1 rounded-pill text-[12px] font-medium ${proficiencyColors[fw.proficiency] || 'bg-bg text-text-dim'}`}
                      >
                        {fw.name} · {fw.proficiency}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {structuredProfile.domains.length > 0 && (
                <div className="bg-white rounded-[14px] border border-border p-5">
                  <h3 className="text-[14px] font-semibold text-text-muted mb-2">Domains</h3>
                  <div className="flex flex-wrap gap-2">
                    {structuredProfile.domains.map((domain) => (
                      <span
                        key={domain}
                        className="px-3 py-1 rounded-pill text-[12px] font-medium bg-accent/10 text-accent"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-[14px] p-8 text-center text-text-dim">
              <p className="text-[14px]">No structured profile yet.</p>
              <p className="text-[13px] mt-1">
                Enter your skills description and click "Generate AI Profile" to create one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Availability */}
      <div className="mt-8">
        <h2 className="text-[20px] font-bold text-text mb-4">Daily Availability</h2>
        <div className="bg-white rounded-[14px] border border-border p-5">
          <p className="text-[13px] text-text-muted mb-4">
            Set your available hours so the planner knows when you can work. This is used to calculate if your day is overbooked.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
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
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="btn-primary mt-4"
          >
            {savingSettings ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
