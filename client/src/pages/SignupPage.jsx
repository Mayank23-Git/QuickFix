import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const ACADEMIC_YEARS = ['', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'];

export function SignupPage() {
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    college: '',
    branch: '',
    academicYear: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
      });
      toast.success('Welcome to QuickFix! Add your skills next to get matched with peers.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-[#F8FAFC]">Create your student account</h1>
            <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
              Post doubts, claim requests in your strong subjects, and mentor classmates.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-500/15 px-3.5 py-2.5 text-sm text-rose-800 dark:text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleChange}
                placeholder="Priya Sharma"
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8] focus:border-indigo-500 dark:focus:border-[#818CF8]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="priya@college.edu"
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8] focus:border-indigo-500 dark:focus:border-[#818CF8]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="college" className="block text-xs font-medium text-zinc-700 dark:text-[#94A3B8] mb-1">
                  College (optional)
                </label>
                <input
                  id="college"
                  name="college"
                  type="text"
                  value={form.college}
                  onChange={handleChange}
                  placeholder="MIT / NIT / State Univ."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                />
              </div>

              <div>
                <label htmlFor="academicYear" className="block text-xs font-medium text-zinc-700 dark:text-[#94A3B8] mb-1">
                  Year (optional)
                </label>
                <select
                  id="academicYear"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y || 'blank'} value={y}>
                      {y || 'Select year'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="branch" className="block text-xs font-medium text-zinc-700 dark:text-[#94A3B8] mb-1">
                Branch / Department (optional)
              </label>
              <input
                id="branch"
                name="branch"
                type="text"
                value={form.branch}
                onChange={handleChange}
                placeholder="Computer Science & Engineering"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-zinc-600 dark:text-[#94A3B8] text-center">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
