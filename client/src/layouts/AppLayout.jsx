import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  LayoutDashboard,
  MessageSquareText,
  PlusCircle,
  Video,
  Trophy,
  Award,
  ShieldCheck,
  TrendingUp,
  Users,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { ThemeSelector } from '../components/ThemeSelector.jsx';
import { formatRelativeTime } from '../utils/time.js';

const SIDEBAR_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/skill-growth', label: 'Skill Growth', icon: TrendingUp },
  { to: '/doubts', label: 'Doubt Board', icon: MessageSquareText },
  { to: '/doubts/new', label: 'Post a Doubt', icon: PlusCircle },
  { to: '/sessions', label: 'My Sessions', icon: Video },
  { to: '/peers', label: 'Find Peers', icon: Users },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const MOBILE_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/skill-growth', label: 'Growth', icon: TrendingUp },
  { to: '/doubts', label: 'Doubts', icon: MessageSquareText },
  { to: '/sessions', label: 'Sessions', icon: Video },
  { to: '/achievements', label: 'Badges', icon: Award },
];

export function AppLayout({ title, subtitle, children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const toast = useToast();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifContainerRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return undefined;
    const handleOutside = (event) => {
      if (notifContainerRef.current && !notifContainerRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [notifOpen]);

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out of QuickFix.');
    navigate('/');
  };

  const handleOpenNotification = (notif) => {
    if (!notif.read) {
      markRead(notif._id);
    }
    setNotifOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0F172A] text-zinc-900 dark:text-[#F8FAFC] flex transition-colors duration-150">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 shrink-0 bg-white dark:bg-[#111827] border-r border-zinc-200 dark:border-[#334155] sticky top-0 h-screen">
        <div className="h-16 px-5 flex items-center border-b border-zinc-200 dark:border-[#334155]">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-[#F8FAFC] whitespace-nowrap"
          >
            QuickFix
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/doubts'}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-[#818CF8]/15 dark:text-[#818CF8]'
                      : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC] hover:bg-zinc-50 dark:hover:bg-[#1E293B]'
                  }`
                }
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.to === '/sessions' && isAuthenticated && unreadCount > 0 && (
                  <span className="font-mono text-[11px] font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}

          {isAuthenticated && user && (
            <NavLink
              to={`/profile/${user._id}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-[#818CF8]/15 dark:text-[#818CF8]'
                    : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC] hover:bg-zinc-50 dark:hover:bg-[#1E293B]'
                }`
              }
            >
              <User className="w-4 h-4 shrink-0" />
              <span>My Profile</span>
            </NavLink>
          )}

          {isAuthenticated && user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-[#818CF8]/15 dark:text-[#818CF8]'
                    : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC] hover:bg-zinc-50 dark:hover:bg-[#1E293B]'
                }`
              }
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Admin Console</span>
            </NavLink>
          )}
        </nav>

        {isAuthenticated && user ? (
          <div className="p-3 border-t border-zinc-200 dark:border-[#334155] space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-[#94A3B8]">Theme</span>
              <ThemeSelector variant="compact-segmented" />
            </div>

            <Link
              to={`/profile/${user._id}`}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#1E293B] transition-colors"
            >
              <Avatar src={user.avatarUrl} name={user.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC] truncate">{user.fullName}</p>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8] tabular-nums truncate">
                  {user.contributionPoints || 0} pts · {user.completedSessions || 0} sessions
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC] hover:bg-zinc-50 dark:hover:bg-[#1E293B] rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-zinc-200 dark:border-[#334155] space-y-2.5">
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-[#94A3B8]">Theme</span>
              <ThemeSelector variant="compact-segmented" />
            </div>
            <Link
              to="/login"
              className="block w-full text-center px-3 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-[#1E293B] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="block w-full text-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors"
            >
              Create Account
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">
        <header className="h-16 bg-white dark:bg-[#111827] border-b border-zinc-200 dark:border-[#334155] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="md:hidden font-display text-lg font-bold text-zinc-900 dark:text-[#F8FAFC] whitespace-nowrap shrink-0"
            >
              QuickFix
            </Link>
            <span className="md:hidden text-zinc-300 dark:text-[#334155]" aria-hidden="true">/</span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC] truncate">
                {title || 'QuickFix'}
              </h1>
              {subtitle && (
                <p className="hidden sm:block text-xs text-zinc-500 dark:text-[#94A3B8] truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <ThemeSelector variant="dropdown" />

            {isAuthenticated ? (
              <>
                {/* Notifications Dropdown */}
                <div className="relative" ref={notifContainerRef}>
                  <button
                    type="button"
                    onClick={() => setNotifOpen((prev) => !prev)}
                    aria-label="Session notifications"
                    aria-expanded={notifOpen}
                    className="relative inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-[#273449] transition-colors"
                  >
                    <Bell className="w-4 h-4 text-zinc-600 dark:text-[#94A3B8]" />
                    <span className="hidden sm:inline">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="font-mono text-[11px] font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                        ({unreadCount})
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl shadow-sm dark:shadow-lg dark:shadow-black/30 z-40 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-100 dark:border-[#334155] flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                          Session Notifications
                        </span>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllRead}
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-[#334155]">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-zinc-500 dark:text-[#94A3B8]">
                            No notifications yet. When a peer accepts or starts your doubt session, it appears here.
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const sessionId = notif.sessionId?._id || notif.sessionId;
                            const isCancelled = notif.type === 'session_cancelled';
                            return (
                              <div
                                key={notif._id}
                                className={`p-3.5 space-y-2 transition-colors ${
                                  notif.read
                                    ? 'bg-white dark:bg-[#1E293B]'
                                    : 'bg-indigo-50/40 dark:bg-[#818CF8]/10'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <Avatar
                                    src={notif.senderId?.avatarUrl}
                                    name={notif.senderId?.fullName}
                                    size="xs"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p className="text-xs text-zinc-800 dark:text-slate-200 leading-relaxed">
                                      {notif.message}
                                    </p>
                                    <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-[#94A3B8]">
                                      <span className="tabular-nums">
                                        {formatRelativeTime(notif.createdAt)}
                                      </span>
                                      {!notif.read && (
                                        <button
                                          type="button"
                                          onClick={() => markRead(notif._id)}
                                          className="text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC] font-medium"
                                        >
                                          Mark read
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {sessionId && !isCancelled && (
                                  <div className="pl-8 flex items-center gap-2">
                                    <Link
                                      to={`/sessions/${sessionId}`}
                                      onClick={() => handleOpenNotification(notif)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors"
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                      <span>Join Session</span>
                                    </Link>
                                    {notif.senderId?._id && (
                                      <Link
                                        to={`/profile/${notif.senderId._id}`}
                                        onClick={() => setNotifOpen(false)}
                                        className="text-xs font-medium text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC] px-2 py-1"
                                      >
                                        View Profile
                                      </Link>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to="/doubts/new"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Post a Doubt</span>
                  <span className="sm:hidden">Post</span>
                </Link>
                {user && (
                  <Link to={`/profile/${user._id}`} className="md:hidden shrink-0">
                    <Avatar src={user.avatarUrl} name={user.fullName} size="sm" />
                  </Link>
                )}
              </>
            ) : (
              <Link
                to="/signup"
                className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Get Started
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white dark:bg-[#111827] border-t border-zinc-200 dark:border-[#334155] grid grid-cols-5"
      >
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/doubts'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-[#818CF8]'
                    : 'text-zinc-500 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
