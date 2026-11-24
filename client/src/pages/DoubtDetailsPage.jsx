import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Video, Edit3, Trash2, Award, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { HelperMatchCard } from '../components/HelperMatchCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiRequest } from '../services/api.js';
import { formatDateTime } from '../utils/time.js';
import { formatStatusLabel, getStatusLabelStyle, getUrgencyLabelStyle } from '../utils/badges.js';

export function DoubtDetailsPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [matchedHelpers, setMatchedHelpers] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/requests/${id}`);
      setRequest(data.request);
      setMatchedHelpers(data.matchedHelpers || []);
      setSession(data.session || null);
    } catch (err) {
      setError(err.message || 'Unable to load doubt details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleClaim = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setClaiming(true);
    try {
      const data = await apiRequest(`/api/requests/${id}/claim`, { method: 'POST' });
      toast.success(data.message || 'Request claimed! Joining mentoring room.');
      navigate(`/sessions/${data.session._id}`);
    } catch (err) {
      toast.error(err.message || 'Unable to claim request.');
      loadDetail();
    } finally {
      setClaiming(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiRequest(`/api/requests/${id}`, { method: 'DELETE' });
      toast.success('Doubt deleted.');
      navigate('/doubts');
    } catch (err) {
      toast.error(err.message || 'Unable to delete doubt.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const isAuthor = Boolean(user && request && String(user._id) === String(request.authorId?._id));
  const isParticipant = Boolean(
    user &&
      session &&
      (String(user._id) === String(session.requesterId) || String(user._id) === String(session.helperId))
  );

  return (
    <AppLayout title="Doubt Details" subtitle="Inspect problem context, matched helpers, and session actions">
      <div className="space-y-6">
        <Link
          to="/doubts"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Doubt Board</span>
        </Link>

        {loading ? (
          <div className="h-72 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse" />
        ) : error ? (
          <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/35 rounded-xl p-6 text-center space-y-3">
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            <button
              type="button"
              onClick={loadDetail}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Request Column */}
            <div className="lg:col-span-8 space-y-5">
              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 sm:p-7 space-y-5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500 dark:text-[#94A3B8]">
                  <span className="font-semibold text-zinc-900 dark:text-[#F8FAFC]">{request.skillId?.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className={getUrgencyLabelStyle(request.urgency)}>{request.urgency} urgency</span>
                  <span aria-hidden="true">·</span>
                  <span className={getStatusLabelStyle(request.status)}>
                    {formatStatusLabel(request.status)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Posted {formatDateTime(request.createdAt)}</span>
                  {request.bountyPoints > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-[#818CF8] font-medium tabular-nums">
                        <Award className="w-3.5 h-3.5" />
                        +{request.bountyPoints} bounty pts
                      </span>
                    </>
                  )}
                </div>

                <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-[#F8FAFC] leading-snug">
                  {request.title}
                </h2>

                <div className="text-sm sm:text-base text-zinc-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {request.description}
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-[#334155] flex flex-wrap items-center justify-between gap-4">
                  <Link
                    to={`/profile/${request.authorId?._id}`}
                    className="flex items-center gap-3 group"
                  >
                    <Avatar src={request.authorId?.avatarUrl} name={request.authorId?.fullName} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC] group-hover:text-indigo-700 dark:group-hover:text-[#818CF8]">
                        {request.authorId?.fullName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                        {[request.authorId?.branch, request.authorId?.college].filter(Boolean).join(' · ') || 'Student'}
                      </p>
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {isAuthor && ['Open', 'Pending Acceptance'].includes(request.status) && (
                      <>
                        <Link
                          to={`/doubts/${request._id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit</span>
                        </Link>

                        {!confirmDelete ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 bg-white dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/35 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/25"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleDelete}
                              disabled={deleting}
                              className="px-3.5 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60"
                            >
                              {deleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(false)}
                              className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {!isAuthor && ['Open', 'Pending Acceptance'].includes(request.status) && (
                      <button
                        type="button"
                        onClick={handleClaim}
                        disabled={claiming}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60 transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        <span>{claiming ? 'Claiming Request...' : 'Accept & Start 15m Session'}</span>
                      </button>
                    )}

                    {isParticipant && session && (
                      <Link
                        to={`/sessions/${session._id}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        <span>
                          {session.status === 'Completed' ? 'View Completed Session' : 'Open Video Session Room'}
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {request.helperId && (
                <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-[#2DD4BF] shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Assigned Helper</p>
                      <Link
                        to={`/profile/${request.helperId._id}`}
                        className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC] hover:text-indigo-700 dark:hover:text-[#818CF8]"
                      >
                        {request.helperId.fullName}
                      </Link>
                    </div>
                  </div>
                  <span className={`text-xs ${getStatusLabelStyle(request.status)}`}>
                    {formatStatusLabel(request.status)}
                  </span>
                </div>
              )}
            </div>

            {/* Smart Skill Matching Column */}
            <aside className="lg:col-span-4 space-y-3">
              <div>
                <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  Skill-based matched helpers
                </h3>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8] mt-0.5">
                  Ranked by exact & related skills, proficiency, and completed sessions.
                </p>
              </div>

              {matchedHelpers.length === 0 ? (
                <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 text-xs text-zinc-600 dark:text-[#94A3B8] leading-relaxed">
                  No students currently list {request.skillId?.name || 'this skill'} or a related skill yet. Any student on campus can still claim and help with this doubt.
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedHelpers.map((match) => (
                    <HelperMatchCard key={match.user._id} match={match} />
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
