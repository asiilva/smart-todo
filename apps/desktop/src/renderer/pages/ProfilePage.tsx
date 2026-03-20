import { useState, useEffect } from 'react';
import { apiClient } from '../services/api-client';

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
  beginner: 'bg-gray-200 text-gray-700',
  intermediate: 'bg-blue-100 text-blue-700',
  senior: 'bg-green-100 text-green-700',
  expert: 'bg-purple-100 text-purple-700',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Tech Profile</h1>

      {claudeAvailable === false && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-6">
          <p className="font-medium">Claude CLI not detected</p>
          <p className="text-sm mt-1">
            Install Claude Code CLI to enable AI-powered profile generation.
            You can still save your profile manually.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your skills and experience
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="e.g., I'm a senior full-stack developer with 8 years of experience. Proficient in TypeScript, React, Node.js, Python. Experience with AWS, Docker, PostgreSQL. Domain expertise in fintech and e-commerce."
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            {claudeAvailable !== false && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
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
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Experience</h3>
                <p className="text-2xl font-bold text-primary-600">
                  {structuredProfile.yearsOfExperience} years
                </p>
              </div>

              {structuredProfile.languages.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {structuredProfile.languages.map((lang) => (
                      <span
                        key={lang.name}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${proficiencyColors[lang.proficiency] || 'bg-gray-100'}`}
                      >
                        {lang.name} · {lang.proficiency}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {structuredProfile.frameworks.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Frameworks</h3>
                  <div className="flex flex-wrap gap-2">
                    {structuredProfile.frameworks.map((fw) => (
                      <span
                        key={fw.name}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${proficiencyColors[fw.proficiency] || 'bg-gray-100'}`}
                      >
                        {fw.name} · {fw.proficiency}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {structuredProfile.domains.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Domains</h3>
                  <div className="flex flex-wrap gap-2">
                    {structuredProfile.domains.map((domain) => (
                      <span
                        key={domain}
                        className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
              <p>No structured profile yet.</p>
              <p className="text-sm mt-1">
                Enter your skills description and click "Generate AI Profile" to create one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Availability */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Daily Availability</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-4">
            Set your available hours so the planner knows when you can work. This is used to calculate if your day is overbooked.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
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
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {savingSettings ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
