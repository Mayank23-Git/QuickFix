import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Video, Award, Sparkles, Star, XCircle } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { JitsiMeet } from '../components/JitsiMeet.jsx';
import { SessionTimer } from '../components/SessionTimer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { apiRequest } from '../services/api.js';
import { formatDateTime, formatRelativeTime } from '../utils/time.js';
import { formatStatusLabel, getStatusLabelStyle } from '../utils/badges.js';

export function ActiveSessionPage() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const { subscribeSessionEvents } = useNotifications();

  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inCall, setInCall] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [rating, setRating] = useState(5);
  const [helpful, setHelpful] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadSession = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/sessions/${id}`);
      setSession(data.session);
      setFeedback(data.feedback || null);
      if (data.session?.status === 'Completed' || data.session?.status === 'Cancelled') {
        setInCall(false);
      }
    } catch (err) {
      if (!silent) setError(err.message || 'Unable to load mentoring session.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Listen for real-time updates from Socket.IO (or polling fallback)
  useEffect(() => {
    return subscribeSessionEvents((eventType, payload) => {
      if (eventType === 'poll:tick') {
        loadSession({ silent: true });
        return;
      }
      const updated = payload?.session;
      if (updated && String(updated._id) === String(id)) {
        setSession(updated);
        if (updated.status === 'Completed' || updated.status === 'Cancelled') {
          setInCall(false);
        }
      }
    });
  }, [id, subscribeSessionEvents, loadSession]);

  const handleStartCall = useCallback(async () => {
    if (session?.status === 'Completed' || session?.status === 'Cancelled') return;
    setInCall(true);
    try {
      const data = await apiRequest(`/api/sessions/${id}/start`, { method: 'POST' });
      if (data.session) setSession(data.session);
    } catch {
      // Keep room open if network hiccups
    }
  }, [id, session?.status]);

  const handleMarkReady = async () => {
    setMarkingReady(true);
    try {
      const data = await apiRequest(`/api/sessions/${id}/ready`, { method: 'POST' });
      if (data.session) setSession(data.session);
      toast.info('Marked session Ready to Join and notified your peer.');
    } catch (err) {
      toast.error(err.message || 'Unable to mark ready.');
    } finally {
      setMarkingReady(false);
    }
  };

  const handleCompleteSession = async () => {
    setCompleting(true);
    try {
      const data = await apiRequest(`/api/sessions/${id}/complete`, { method: 'POST' });
      setSession(data.session);
      setInCall(false);
      setConfirmComplete(false);
      await refreshUser();
      toast.success(data.message || 'Session completed!');
    } catch (err) {
      toast.error(err.message || 'Unable to complete session.');
    } finally {
      setCompleting(false);
    }
  };

  const handleCancelSession = async () => {
    setCancelling(true);
    try {
      const data = await apiRequest(`/api/sessions/${id}/cancel`, { method: 'POST' });
      setSession(data.session);
      setInCall(false);
      setConfirmCancel(false);
      toast.info(data.message || 'Session cancelled.');
    } catch (err) {
      toast.error(err.message || 'Unable to cancel session.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitFeedback = async (event) => {
    event.preventDefault();
    setSubmittingFeedback(true);
    try {
      const data = await apiRequest(`/api/sessions/${id}/feedback`, {
        method: 'POST',
        body: {
          rating,
          helpful,
          comment: comment.trim(),
        },
      });
      setFeedback(data.feedback || { rating, helpful, comment: comment.trim(), xpAwarded: data.xpAwarded > 0 });
      await refreshUser();
      toast.success(data.message || 'Feedback submitted.');
    } catch (err) {
      toast.error(err.message || 'Unable to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const isClosed = session?.status === 'Completed' || session?.status === 'Cancelled';
  const isHelper = Boolean(
    user && session && String(user._id) === String(session.helperId?._id || session.helperId)
  );
  const peerName = isHelper
    ? session?.requesterId?.fullName || 'Requester'
    : session?.helperId?.fullName || 'Helper';

  return (
    <AppLayout
      title="15-Minute Mentoring Session"
      subtitle="Shared video room with real-time participant status and persisted timer"
    >
      <div className="space-y-6">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Sessions</span>
        </Link>

        {loading ? (
          <div className="h-96 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse" />
        ) : error ? (
          <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/40 rounded-xl p-6 text-center space-y-3">
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            <Link
              to="/sessions"
              className="inline-block px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors"
            >
              Return to My Sessions
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Header Bar */}
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-[#94A3B8]">
                  <span className={getStatusLabelStyle(session.status)}>
                    {formatStatusLabel(session.status)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-zinc-800 dark:text-slate-200">
                    {session.requestId?.skillId?.name || 'Mentoring'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>20 base pts + {session.requestId?.bountyPoints || 0} bounty pts</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{session.roomName}</span>
                </div>

                <h2 className="font-display text-lg sm:text-xl font-bold text-zinc-900 dark:text-[#F8FAFC]">
                  {session.requestId?.title}
                </h2>

                {session.status !== 'Cancelled' ? (
                  <SessionTimer
                    startedAt={session.startedAt}
                    durationMinutes={session.duration || 15}
                    status={session.status}
                  />
                ) : (
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    Session cancelled {session.cancelledAt ? formatDateTime(session.cancelledAt) : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {!isClosed && (session.status === 'Accepted' || session.status === 'Claimed') && (
                  <button
                    type="button"
                    disabled={markingReady}
                    onClick={handleMarkReady}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 disabled:opacity-60 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{markingReady ? 'Updating...' : 'Mark Ready'}</span>
                  </button>
                )}

                {!isClosed && !inCall && (
                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Video Session</span>
                  </button>
                )}

                {!isClosed && (
                  !confirmComplete ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmComplete(true);
                        setConfirmCancel(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-[#2DD4BF] bg-emerald-50 dark:bg-[#2DD4BF]/15 border border-emerald-200 dark:border-[#2DD4BF]/35 rounded-lg hover:bg-emerald-100 dark:hover:bg-[#2DD4BF]/25 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCompleteSession}
                        disabled={completing}
                        className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white dark:text-[#0F172A] bg-emerald-600 dark:bg-[#2DD4BF] rounded-lg hover:bg-emerald-700 dark:hover:bg-[#5EEAD4] disabled:opacity-60 transition-colors"
                      >
                        {completing ? 'Completing...' : 'Confirm & Award'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmComplete(false)}
                        className="px-2.5 py-2 text-xs text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
                      >
                        Back
                      </button>
                    </div>
                  )
                )}

                {!isClosed && (
                  !confirmCancel ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmCancel(true);
                        setConfirmComplete(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:text-rose-300 bg-white dark:bg-[#273449] border border-rose-200 dark:border-rose-500/35 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelSession}
                        disabled={cancelling}
                        className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60"
                      >
                        {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(false)}
                        className="px-2.5 py-2 text-xs text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
                      >
                        Back
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Video Call Area */}
              <div className="lg:col-span-8">
                {session.status === 'Completed' ? (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-8 text-center space-y-4">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-[#2DD4BF] mx-auto" />
                      <div className="space-y-1">
                        <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-[#F8FAFC]">
                          Mentoring Session Completed
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
                          Completed {formatDateTime(session.completedAt)} · Helper earned{' '}
                          <span className="font-mono font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                            +{session.pointsAwarded} pts
                          </span>
                          {' · Verified Achievement XP credited'}
                        </p>
                      </div>
                      <div className="pt-2 flex flex-wrap justify-center gap-3">
                        <Link
                          to="/doubts"
                          className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Back to Doubt Board
                        </Link>
                        <Link
                          to="/achievements"
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] transition-colors"
                        >
                          <Award className="w-4 h-4" />
                          <span>View Achievements</span>
                        </Link>
                      </div>
                    </div>

                    {!isHelper && !feedback && (
                      <form
                        onSubmit={handleSubmitFeedback}
                        className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 space-y-4"
                      >
                        <div className="space-y-1">
                          <h4 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                            Rate Your Peer Mentor
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                            Positive feedback (4-5 stars and marked helpful) awards verified bonus Achievement XP to {session.helperId?.fullName || 'your helper'}.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <span className="block text-xs font-medium text-zinc-700 dark:text-slate-200">Session Rating</span>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setRating(score)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                                  rating >= score
                                    ? 'bg-indigo-50 dark:bg-[#818CF8]/15 border-indigo-300 dark:border-[#818CF8]/45 text-indigo-700 dark:text-[#818CF8]'
                                    : 'bg-white dark:bg-[#111827] border-zinc-200 dark:border-[#334155] text-zinc-500 dark:text-[#94A3B8] hover:bg-zinc-50 dark:hover:bg-[#273449]'
                                }`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    rating >= score
                                      ? 'fill-indigo-600 text-indigo-600 dark:fill-[#818CF8] dark:text-[#818CF8]'
                                      : 'text-zinc-400 dark:text-slate-500'
                                  }`}
                                />
                                <span>{score}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={helpful}
                            onChange={(e) => setHelpful(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-[#334155] dark:bg-[#111827] text-indigo-600 dark:text-[#818CF8] focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                          />
                          <span>This session was helpful and resolved my doubt</span>
                        </label>

                        <div className="space-y-1.5">
                          <label htmlFor="session-feedback-comment" className="block text-xs font-medium text-zinc-700 dark:text-slate-200">
                            Optional Comment
                          </label>
                          <textarea
                            id="session-feedback-comment"
                            rows={2}
                            maxLength={500}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share what helped most during the mentoring call..."
                            className="w-full px-3 py-2 text-sm text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] bg-white dark:bg-[#111827] border border-zinc-200 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={submittingFeedback}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] disabled:opacity-60 transition-colors"
                          >
                            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                          </button>
                        </div>
                      </form>
                    )}

                    {feedback && (
                      <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                            Session Feedback Recorded
                          </h4>
                          <span className="font-mono text-xs font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                            {feedback.rating}/5 · {feedback.helpful ? 'Helpful' : 'Submitted'}
                          </span>
                        </div>
                        {feedback.comment && (
                          <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">{feedback.comment}</p>
                        )}
                        {feedback.xpAwarded && (
                          <p className="text-xs text-emerald-700 dark:text-[#2DD4BF] font-medium">
                            Verified positive feedback bonus XP awarded to helper.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : session.status === 'Cancelled' ? (
                  <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/40 rounded-xl p-8 text-center space-y-4">
                    <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-[#F8FAFC]">
                        Session Cancelled
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
                        This mentoring session was cancelled and is no longer active.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-wrap justify-center gap-3">
                      <Link
                        to="/sessions"
                        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Return to My Sessions
                      </Link>
                      <Link
                        to="/doubts"
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] transition-colors"
                      >
                        Browse Doubt Board
                      </Link>
                    </div>
                  </div>
                ) : inCall ? (
                  <JitsiMeet
                    sessionId={session._id}
                    roomName={session.roomName}
                    displayName={user?.fullName || 'QuickFix Student'}
                    email={user?.email}
                    peerName={peerName}
                    onJoined={handleStartCall}
                    onHangup={() => setInCall(false)}
                  />
                ) : (
                  <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-8 text-center space-y-4">
                    <Video className="w-10 h-10 text-indigo-600 dark:text-[#818CF8] mx-auto" />
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                        Shared Mentoring Room Ready
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
                        Both {session.requesterId?.fullName} and {session.helperId?.fullName} share room{' '}
                        <span className="font-mono text-zinc-800 dark:text-slate-200">{session.roomName}</span>. Joining transitions the session to In Progress and starts the 15-minute timer.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartCall}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      <span>Join Video Session Now</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Request Context & Participants */}
              <aside className="lg:col-span-4 space-y-4">
                <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-4">
                  <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">Participants</h3>

                  <div className="space-y-3">
                    <Link
                      to={`/profile/${session.requesterId?._id}`}
                      className="flex items-center gap-3 group"
                    >
                      <Avatar src={session.requesterId?.avatarUrl} name={session.requesterId?.fullName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Student Requesting Help</p>
                        <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC] group-hover:text-indigo-700 dark:group-hover:text-[#818CF8] truncate">
                          {session.requesterId?.fullName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8]">
                          {session.requesterJoinedAt
                            ? `Joined call ${formatRelativeTime(session.requesterJoinedAt)}`
                            : 'Has not joined call yet'}
                        </p>
                      </div>
                    </Link>

                    <Link
                      to={`/profile/${session.helperId?._id}`}
                      className="flex items-center gap-3 group"
                    >
                      <Avatar src={session.helperId?.avatarUrl} name={session.helperId?.fullName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Assigned Helper</p>
                        <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC] group-hover:text-indigo-700 dark:group-hover:text-[#818CF8] truncate">
                          {session.helperId?.fullName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8]">
                          {session.helperJoinedAt
                            ? `Joined call ${formatRelativeTime(session.helperJoinedAt)}`
                            : 'Has not joined call yet'}
                        </p>
                      </div>
                    </Link>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-[#334155] text-xs text-zinc-500 dark:text-[#94A3B8] space-y-1">
                    <p>Room: <span className="font-mono text-zinc-700 dark:text-slate-200">{session.roomName}</span></p>
                    <p>Started: {formatDateTime(session.startedAt)}</p>
                    {session.completedAt && <p>Completed: {formatDateTime(session.completedAt)}</p>}
                    {session.cancelledAt && <p>Cancelled: {formatDateTime(session.cancelledAt)}</p>}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-2.5">
                  <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">Doubt Description</h3>
                  <p className="text-sm text-zinc-600 dark:text-[#94A3B8] whitespace-pre-wrap leading-relaxed">
                    {session.requestId?.description}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
