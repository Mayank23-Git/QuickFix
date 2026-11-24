import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  CheckCircle2,
  MessageSquareText,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { SessionTimer } from '../components/SessionTimer.jsx';
import { CardSkeleton } from '../components/Skeletons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { apiRequest } from '../services/api.js';
import { formatDateTime, formatRelativeTime } from '../utils/time.js';
import { formatStatusLabel, getStatusLabelStyle } from '../utils/badges.js';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['Pending Acceptance', 'Accepted', 'Claimed', 'Ready to Join', 'In Progress'];

function SessionCard({
  session,
  role, // 'requester' | 'helper'
  busyId,
  onReady,
  onComplete,
  onCancel,
}) {
  const isHelper = role === 'helper';
  const counterpart = isHelper ? session.requesterId : session.helperId;
  const isActive = ACTIVE_STATUSES.includes(session.status);
  const canMarkReady = isHelper && (session.status === 'Accepted' || session.status === 'Claimed');

  let readinessNote = '';
  if (session.status === 'Completed') {
    readinessNote = `Completed · +${session.pointsAwarded || 20} pts awarded to helper`;
  } else if (session.status === 'Cancelled') {
    readinessNote = `Cancelled ${session.cancelledAt ? formatRelativeTime(session.cancelledAt) : ''}`;
  } else if (isHelper) {
    if (session.requesterJoinedAt) {
      readinessNote = `${counterpart?.fullName || 'Requester'} joined the video call (${formatRelativeTime(
        session.requesterJoinedAt
      )})`;
    } else if (session.status === 'In Progress') {
      readinessNote = 'Video call started · Waiting for requester to join';
    } else if (session.status === 'Ready to Join') {
      readinessNote = 'Marked Ready to Join · Click Join Video Call to begin';
    } else {
      readinessNote = 'Accepted · Join video call or mark ready to notify requester';
    }
  } else {
    if (session.helperJoinedAt) {
      readinessNote = `${counterpart?.fullName || 'Helper'} has started the video call (${formatRelativeTime(
        session.helperJoinedAt
      )})`;
    } else if (session.status === 'In Progress') {
      readinessNote = 'Session is In Progress · Click Join Video Call to enter';
    } else if (session.status === 'Ready to Join') {
      readinessNote = `${counterpart?.fullName || 'Helper'} is ready · Click Join Video Call`;
    } else {
      readinessNote = `${counterpart?.fullName || 'Helper'} accepted your request · Video room ready`;
    }
  }

  return (
    <article className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-[#94A3B8]">
          <span className={getStatusLabelStyle(session.status)}>
            {formatStatusLabel(session.status)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-zinc-800 dark:text-slate-200">
            {session.requestId?.skillId?.name || 'Mentoring'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {formatDateTime(session.completedAt || session.startedAt || session.createdAt)}
          </span>
        </div>

        <h3 className="text-base font-semibold text-zinc-900 dark:text-[#F8FAFC] leading-snug">
          {session.requestId?.title || 'Mentoring Session'}
        </h3>

        {/* Counterpart Profile */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Link
            to={counterpart?._id ? `/profile/${counterpart._id}` : '#'}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <Avatar src={counterpart?.avatarUrl} name={counterpart?.fullName} size="sm" />
            <div className="min-w-0">
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8]">
                {isHelper ? 'Requester' : 'Assigned Helper'}
              </p>
              <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC] group-hover:text-indigo-700 dark:group-hover:text-[#818CF8] truncate">
                {counterpart?.fullName || 'Student'}
              </p>
              {(counterpart?.branch || counterpart?.college) && (
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8] truncate">
                  {[counterpart.branch, counterpart.college].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </Link>

          <div className="text-right shrink-0">
            <p className="text-[11px] text-zinc-400 dark:text-slate-500">Shared Room</p>
            <p className="font-mono text-xs text-zinc-600 dark:text-[#94A3B8] truncate max-w-[160px]">
              {session.roomName}
            </p>
          </div>
        </div>

        {/* Status / Participant Readiness Note */}
        <div className="text-xs text-zinc-600 dark:text-[#94A3B8] bg-zinc-50 dark:bg-[#111827] border border-zinc-100 dark:border-[#334155] rounded-lg px-3 py-2">
          {readinessNote}
        </div>

        {isActive && (
          <div className="pt-2 border-t border-zinc-100 dark:border-[#334155]">
            <SessionTimer
              startedAt={session.startedAt}
              durationMinutes={session.duration || 15}
              status={session.status}
            />
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-zinc-100 dark:border-[#334155] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/sessions/${session._id}`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive
                ? 'text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A]'
                : 'text-zinc-700 dark:text-slate-200 bg-zinc-50 dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] hover:bg-zinc-100 dark:hover:bg-slate-700'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isActive ? 'Join Video Call' : 'View Session Details'}</span>
          </Link>

          {canMarkReady && (
            <button
              type="button"
              disabled={busyId === session._id}
              onClick={() => onReady(session._id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 disabled:opacity-60 whitespace-nowrap transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mark Ready</span>
            </button>
          )}
        </div>

        {isActive && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busyId === session._id}
              onClick={() => onComplete(session._id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-[#2DD4BF] bg-emerald-50 dark:bg-[#2DD4BF]/15 border border-emerald-200 dark:border-[#2DD4BF]/35 rounded-lg hover:bg-emerald-100 dark:hover:bg-[#2DD4BF]/25 disabled:opacity-60 whitespace-nowrap transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete</span>
            </button>
            <button
              type="button"
              disabled={busyId === session._id}
              onClick={() => onCancel(session._id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-300 bg-white dark:bg-[#273449] border border-rose-200 dark:border-rose-500/35 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/15 disabled:opacity-60 whitespace-nowrap transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function MySessionsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const { subscribeSessionEvents } = useNotifications();

  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadSessions = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiRequest('/api/sessions');
      setSessions(data.sessions || []);
    } catch (err) {
      if (!silent) toast.error(err.message || 'Unable to load sessions.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    return subscribeSessionEvents((eventType, payload) => {
      if (eventType === 'poll:tick') {
        loadSessions({ silent: true });
        return;
      }
      const updated = payload?.session;
      if (!updated?._id) {
        loadSessions({ silent: true });
        return;
      }
      setSessions((prev) => {
        const exists = prev.some((s) => String(s._id) === String(updated._id));
        if (exists) {
          return prev.map((s) => (String(s._id) === String(updated._id) ? updated : s));
        }
        return [updated, ...prev];
      });
    });
  }, [subscribeSessionEvents, loadSessions]);

  const filteredSessions = useMemo(() => {
    switch (filter) {
      case 'active':
        return sessions.filter((s) => ACTIVE_STATUSES.includes(s.status));
      case 'completed':
        return sessions.filter((s) => s.status === 'Completed');
      case 'cancelled':
        return sessions.filter((s) => s.status === 'Cancelled');
      default:
        return sessions;
    }
  }, [sessions, filter]);

  const { requestedSessions, helpingSessions } = useMemo(() => {
    if (!user) return { requestedSessions: [], helpingSessions: [] };
    const uid = String(user._id);
    return {
      requestedSessions: filteredSessions.filter(
        (s) => String(s.requesterId?._id || s.requesterId) === uid
      ),
      helpingSessions: filteredSessions.filter(
        (s) => String(s.helperId?._id || s.helperId) === uid
      ),
    };
  }, [filteredSessions, user]);

  const handleReady = async (sessionId) => {
    setBusyId(sessionId);
    try {
      const data = await apiRequest(`/api/sessions/${sessionId}/ready`, { method: 'POST' });
      if (data.session) {
        setSessions((prev) =>
          prev.map((s) => (String(s._id) === String(sessionId) ? data.session : s))
        );
      }
      toast.info('Requester notified that you are ready to join.');
    } catch (err) {
      toast.error(err.message || 'Unable to update readiness.');
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (sessionId) => {
    setBusyId(sessionId);
    try {
      const data = await apiRequest(`/api/sessions/${sessionId}/complete`, { method: 'POST' });
      toast.success(data.message || 'Session completed!');
      await Promise.all([loadSessions({ silent: true }), refreshUser()]);
    } catch (err) {
      toast.error(err.message || 'Unable to complete session.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (sessionId) => {
    setBusyId(sessionId);
    try {
      const data = await apiRequest(`/api/sessions/${sessionId}/cancel`, { method: 'POST' });
      toast.info(data.message || 'Session cancelled.');
      await loadSessions({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Unable to cancel session.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout
      title="My Mentoring Sessions"
      subtitle="Join your shared video rooms, track helper readiness, and manage sessions"
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#111827] border border-transparent dark:border-[#334155] rounded-lg w-fit"
            role="tablist"
            aria-label="Filter sessions by status"
          >
            {FILTER_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={filter === t.id}
                onClick={() => setFilter(t.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filter === t.id
                    ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                    : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-500 dark:text-[#94A3B8] tabular-nums">
            {requestedSessions.length} requested · {helpingSessions.length} helping
          </p>
        </div>

        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="space-y-10">
            {/* Section 1: Sessions I Requested */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-[#334155] pb-2.5">
                <div>
                  <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Sessions I Requested
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    Doubts you posted that a campus peer accepted — join the shared room when ready.
                  </p>
                </div>
                <Link
                  to="/doubts/new"
                  className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                >
                  Post another doubt
                </Link>
              </div>

              {requestedSessions.length === 0 ? (
                <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 text-center space-y-2">
                  <MessageSquareText className="w-6 h-6 text-zinc-400 dark:text-slate-500 mx-auto" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC]">No requested sessions in this view</p>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    When a helper accepts one of your doubts, your shared session appears here immediately.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requestedSessions.map((session) => (
                    <SessionCard
                      key={session._id}
                      session={session}
                      role="requester"
                      busyId={busyId}
                      onReady={handleReady}
                      onComplete={handleComplete}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Section 2: Sessions I Am Helping */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-[#334155] pb-2.5">
                <div>
                  <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Sessions I Am Helping
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    Doubts you claimed to mentor a peer — start the call or mark ready to invite them in.
                  </p>
                </div>
                <Link
                  to="/doubts"
                  className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                >
                  Browse open doubts
                </Link>
              </div>

              {helpingSessions.length === 0 ? (
                <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 text-center space-y-2">
                  <Video className="w-6 h-6 text-zinc-400 dark:text-slate-500 mx-auto" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC]">No mentoring sessions claimed yet</p>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    Pick an open doubt from the Doubt Board to start a 15-minute mentoring session.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {helpingSessions.map((session) => (
                    <SessionCard
                      key={session._id}
                      session={session}
                      role="helper"
                      busyId={busyId}
                      onReady={handleReady}
                      onComplete={handleComplete}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
