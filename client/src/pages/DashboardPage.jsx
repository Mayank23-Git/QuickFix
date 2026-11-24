import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Users, Video, ArrowRight, Award, CheckCircle2, Bell, Flame, TrendingUp } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { apiRequest } from '../services/api.js';
import { DoubtCard } from '../components/DoubtCard.jsx';
import { HelperMatchCard } from '../components/HelperMatchCard.jsx';
import { CardSkeleton } from '../components/Skeletons.jsx';
import { formatRelativeTime } from '../utils/time.js';
import { formatStatusLabel, getStatusLabelStyle } from '../utils/badges.js';

export function DashboardPage() {
  const { user } = useAuth();
  const { notifications, markRead, subscribeSessionEvents } = useNotifications();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/users/me/dashboard');
      setDashboard(data.dashboard);
    } catch (err) {
      if (!silent) setError(err.message || 'Unable to load dashboard.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    return subscribeSessionEvents(() => {
      loadDashboard({ silent: true });
    });
  }, [subscribeSessionEvents, loadDashboard]);

  const unreadSessionInvites = notifications.filter(
    (n) => !n.read && n.type !== 'session_cancelled' && n.sessionId
  );

  return (
    <AppLayout
      title={`Welcome back, ${user?.fullName?.split(' ')[0] || 'Student'}`}
      subtitle="Your campus doubts, matched peers, and active 15-minute mentoring sessions"
    >
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse" />
            ))}
          </div>
          <CardSkeleton count={4} />
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/35 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Unread Session Invitations / Alerts */}
          {unreadSessionInvites.length > 0 && (
            <section className="space-y-3" aria-label="Session invitations">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" />
                <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  New session invitations
                </h2>
              </div>
              <div className="space-y-2.5">
                {unreadSessionInvites.slice(0, 3).map((notif) => {
                  const sessId = notif.sessionId?._id || notif.sessionId;
                  return (
                    <div
                      key={notif._id}
                      className="bg-white dark:bg-[#1E293B] border border-indigo-200 dark:border-[#818CF8]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC]">{notif.message}</p>
                        <p className="text-xs text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/sessions/${sessId}`}
                          onClick={() => markRead(notif._id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Session</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => markRead(notif._id)}
                          className="px-2.5 py-2 text-xs font-medium text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quick Action & Profile Completion Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between gap-3 max-w-md">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">Profile completion</span>
                  <span className="font-mono text-sm font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                    {dashboard.profileCompletion}%
                  </span>
                </div>
                <div className="w-full max-w-md h-2 bg-zinc-100 dark:bg-[#273449] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-[#818CF8] rounded-full transition-all duration-300"
                    style={{ width: `${dashboard.profileCompletion}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                  {dashboard.missingFields.length > 0
                    ? `Add ${dashboard.missingFields.slice(0, 2).join(' and ')} to improve skill matching.`
                    : 'Your profile and skills are ready for peer matching.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  to="/profile/edit"
                  className="px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  {dashboard.mySkills.length === 0 ? 'Add Your Skills' : 'Edit Profile'}
                </Link>
                <Link
                  to="/peers"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 transition-colors whitespace-nowrap"
                >
                  <Users className="w-4 h-4" />
                  <span>Find Students</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Need help with a blocker?</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC] mt-0.5">
                  Start a 15-minute live walkthrough
                </p>
              </div>
              <Link
                to="/doubts/new"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post a Doubt</span>
              </Link>
            </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Contribution Points</p>
                <Link to="/achievements" className="text-[11px] font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]">
                  {user?.achievementXp || 0} XP
                </Link>
              </div>
              <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
                {user?.contributionPoints || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Completed Sessions</p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
                {user?.completedSessions || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">My Listed Skills</p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
                {dashboard.mySkills.length}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Open Board Doubts</p>
              <p className="font-mono text-2xl font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                {dashboard.openRequestsCount}
              </p>
            </div>
          </div>

          {/* Active Mentoring Sessions */}
          {dashboard.activeSessions.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  Active mentoring sessions
                </h2>
                <Link to="/sessions" className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]">
                  All sessions
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.activeSessions.map((session) => (
                  <div
                    key={session._id}
                    className="bg-white dark:bg-[#1E293B] border border-indigo-200 dark:border-[#818CF8]/40 rounded-xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
                        <span className={getStatusLabelStyle(session.status)}>
                          {formatStatusLabel(session.status)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{session.requestId?.skillId?.name || 'Mentoring'}</span>
                        <span aria-hidden="true">·</span>
                        <span>15-min call</span>
                      </div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-[#F8FAFC] leading-snug">
                        {session.requestId?.title || 'Mentoring Session'}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-[#94A3B8]">
                        Requester: {session.requesterId?.fullName} · Helper: {session.helperId?.fullName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-[#334155]">
                      <span className="font-mono text-xs text-zinc-500 dark:text-[#94A3B8] truncate max-w-[180px]">
                        {session.roomName}
                      </span>
                      <Link
                        to={`/sessions/${session._id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Video Room</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* My Skill Growth & Streak Summary */}
          <section className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  My Skill Growth &amp; Learning Streak
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                {dashboard.skillGrowthSummary?.careerGoal
                  ? `Goal: ${dashboard.skillGrowthSummary.careerGoal} · `
                  : ''}
                Track skill gaps with AI recommendations, visual charts, and daily study streaks.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-800 dark:text-slate-200 tabular-nums">
                <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>{dashboard.skillGrowthSummary?.currentStreak || 0}d streak</span>
                <span className="text-zinc-400 dark:text-[#94A3B8]">·</span>
                <span>{dashboard.skillGrowthSummary?.totalLearningDays || 0} active days</span>
              </div>
              <Link
                to="/skill-growth"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap"
              >
                <span>Open Skill Analyzer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* Skills Overview */}
          <section className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">Your skills overview</h2>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Used to match you with open campus doubts.</p>
              </div>
              <Link
                to="/profile/edit"
                className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC] whitespace-nowrap"
              >
                Manage skills
              </Link>
            </div>
            {dashboard.mySkills.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
                No skills added yet. Add languages or courses like C++, React, SQL, or Discrete Math to receive tailored doubt recommendations.
              </p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-700 dark:text-slate-200">
                {dashboard.mySkills.map((s) => (
                  <span key={s._id} className="inline-flex items-center gap-1.5">
                    <span className="font-medium text-zinc-900 dark:text-[#F8FAFC]">{s.name}</span>
                    <span className="text-xs text-zinc-500 dark:text-[#94A3B8]">({s.proficiency})</span>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Recommended Doubts + Matched Students */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Recommended open doubts
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    {dashboard.mySkills.length > 0
                      ? 'Matched against your profile skills'
                      : 'Latest open doubts waiting for a helper'}
                  </p>
                </div>
                <Link
                  to="/doubts"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                >
                  <span>Browse all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {dashboard.recommendedDoubts.length === 0 ? (
                <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 text-sm text-zinc-600 dark:text-[#94A3B8]">
                  No matching open doubts right now. Check the full doubt board.
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboard.recommendedDoubts.map((doubt) => (
                    <DoubtCard key={doubt._id} doubt={doubt} />
                  ))}
                </div>
              )}
            </section>

            <section className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Skill-matched peers
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    Students ready to help on campus
                  </p>
                </div>
                <Link
                  to="/peers"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                >
                  <span>Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {dashboard.matchedStudents.map((match) => (
                  <HelperMatchCard key={match.user._id} match={match} />
                ))}
              </div>

              {/* Recent Activity / Own Requests */}
              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
                <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  Your recent activity
                </h3>
                {dashboard.myRequests.length === 0 && dashboard.completedSessions.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    Doubts you post and sessions you complete will show up here.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-[#334155]">
                    {dashboard.myRequests.slice(0, 4).map((req) => (
                      <li key={req._id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <Link
                          to={`/doubts/${req._id}`}
                          className="text-xs font-medium text-zinc-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-[#818CF8] truncate"
                        >
                          {req.title}
                        </Link>
                        <span className={`text-xs shrink-0 ${getStatusLabelStyle(req.status)}`}>
                          {formatStatusLabel(req.status)}
                        </span>
                      </li>
                    ))}
                    {dashboard.completedSessions.slice(0, 2).map((sess) => (
                      <li key={sess._id} className="py-2.5 last:pb-0 flex items-center justify-between gap-3 text-xs text-zinc-600 dark:text-[#94A3B8]">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#2DD4BF] shrink-0" />
                          <span className="truncate">{sess.requestId?.title || 'Completed session'}</span>
                        </span>
                        <span className="font-mono text-zinc-500 dark:text-[#94A3B8] shrink-0 tabular-nums">
                          {formatRelativeTime(sess.completedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {dashboard.badges?.length > 0 && (
                <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" />
                    <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">Your earned badges</h3>
                  </div>
                  <div className="space-y-1.5">
                    {dashboard.badges.map((b) => (
                      <div key={b.id} className="text-xs text-zinc-600 dark:text-[#94A3B8]">
                        <span className="font-medium text-zinc-900 dark:text-[#F8FAFC]">{b.name}</span> — {b.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
