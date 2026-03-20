import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-5">
      <div className="w-[400px] max-w-full">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)', boxShadow: '0 4px 16px rgba(124,92,252,0.3)' }}
          >
            ST
          </div>
          <span className="text-[28px] font-extrabold" style={{
            background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Smart Todo
          </span>
        </div>
        <p className="text-center text-sm text-text-muted mb-8">
          Plan your day realistically with AI
        </p>

        {/* Register Card */}
        <div className="bg-white rounded-[20px] p-9 border border-border shadow">
          {error && (
            <div className="rounded-[14px] px-4 py-3 mb-4 text-sm"
              style={{ background: 'rgba(240,85,110,0.08)', border: '1px solid rgba(240,85,110,0.2)', color: '#F0556E' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="form-label">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                className="form-input"
                placeholder="Your full name"
                required
              />
            </div>
            <div className="mb-5">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                className="form-input"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="mb-5">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  className="form-input pr-14"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted text-xs font-semibold transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="mb-5">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                className="form-input"
                placeholder="Re-enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-[15px] font-bold"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-accent font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
