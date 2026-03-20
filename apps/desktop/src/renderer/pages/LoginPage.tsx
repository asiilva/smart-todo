import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/board');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Login Card */}
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
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-14"
                  placeholder="Enter your password"
                  required
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
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-[15px] font-bold"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
