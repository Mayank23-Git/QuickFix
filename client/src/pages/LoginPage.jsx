import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const SEEDED_DEMO_ACCOUNTS = [
  { label: 'Aarav Mehta (C++, DSA, OS)', email: 'aarav.demo@peerup.edu' },
  { label: 'Ananya Rao (React, JS, SQL)', email: 'ananya.demo@peerup.edu' },
  { label: 'Maya Brooks (HTML/CSS, Git)', email: 'maya.demo@peerup.edu' },
];

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoHelper, setShowDemoHelper] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Signed in to QuickFix.');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('PeerUpDemo!2026');
    setError('');
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16 space-y-4">
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-[#F8FAFC]">Sign in to QuickFix</h1>
            <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
              Access your dashboard, active mentoring rooms, and campus doubts.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-500/15 px-3.5 py-2.5 text-sm text-rose-800 dark:text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8] focus:border-indigo-500 dark:focus:border-[#818CF8]"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8] focus:border-indigo-500 dark:focus:border-[#818CF8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-[#94A3B8] hover:text-zinc-700 dark:hover:text-[#F8FAFC] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-zinc-600 dark:text-[#94A3B8] text-center">
            New to QuickFix?{' '}
            <Link to="/signup" className="font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]">
              Create a student account
            </Link>
          </p>
        </div>

        {/* Optional seeded demo accounts helper */}
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4">
          <button
            type="button"
            onClick={() => setShowDemoHelper((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
          >
            <span>Optional: Seeded Demo Test Accounts</span>
            {showDemoHelper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDemoHelper && (
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-[#334155] space-y-2">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8] leading-relaxed">
                If demo seeding is enabled, these seeded accounts authenticate through the standard bcrypt + JWT login API (not required for normal usage).
              </p>
              <div className="space-y-1.5">
                {SEEDED_DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemoAccount(acc.email)}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-700 dark:text-slate-200 bg-zinc-50 dark:bg-[#111827] hover:bg-indigo-50 dark:hover:bg-[#273449] hover:text-indigo-700 dark:hover:text-[#818CF8] rounded-lg border border-zinc-200 dark:border-[#334155] transition-colors"
                  >
                    Fill: {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
