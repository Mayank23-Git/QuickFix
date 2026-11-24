import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ThemeSelector } from '../components/ThemeSelector.jsx';

export function PublicLayout({ children }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] dark:bg-[#0F172A] text-zinc-900 dark:text-[#F8FAFC] transition-colors duration-150">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-sm border-b border-zinc-200 dark:border-[#334155]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            QuickFix
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600 dark:text-[#94A3B8]">
            <Link
              to="/doubts"
              className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              Doubt Board
            </Link>
            <Link
              to="/peers"
              className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              Find Peers
            </Link>
            <Link
              to="/leaderboard"
              className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              Leaderboard
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <ThemeSelector variant="dropdown" />
            <Link
              to={isAuthenticated ? '/dashboard' : '/signup'}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isAuthenticated ? 'Open Workspace' : 'Get Started'}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white dark:bg-[#111827] border-t border-zinc-200 dark:border-[#334155] mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500 dark:text-[#94A3B8]">
          <div className="space-y-1">
            <p className="font-display font-semibold text-zinc-800 dark:text-[#F8FAFC] text-sm">QuickFix</p>
            <p>Campus peer-to-peer micro-skill mentoring & 15-minute live Jitsi Meet sessions.</p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Link to="/doubts" className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors">
              Doubt Board
            </Link>
            <Link to="/peers" className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors">
              Skill Directory
            </Link>
            <Link to="/leaderboard" className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors">
              Leaderboard
            </Link>
            <Link to="/verify" className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors">
              Verify Credential
            </Link>
            <Link to="/login" className="hover:text-zinc-900 dark:hover:text-[#F8FAFC] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
