import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Lock,
  PlusCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { BadgeIcon } from '../components/BadgeIcon.jsx';
import { CertificateModal } from '../components/CertificateModal.jsx';
import { CardSkeleton } from '../components/Skeletons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiRequest } from '../services/api.js';
import { formatDateTime } from '../utils/time.js';

const CATEGORY_FILTERS = ['All', 'Mentoring', 'DSA', 'Community', 'Learning'];
const STATE_FILTERS = ['All', 'Redeemable', 'Earned', 'Locked'];

export function AchievementsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [redeemingId, setRedeemingId] = useState('');
  const [selectedCertBadge, setSelectedCertBadge] = useState(null);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState('approved_resource');
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState('Learning');
  const [reqDescription, setReqDescription] = useState('');
  const [reqEvidenceUrl, setReqEvidenceUrl] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const loadAchievements = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/achievements/me');
      setData(res);
    } catch (err) {
      if (!silent) setError(err.message || 'Unable to load achievements.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const filteredBadges = useMemo(() => {
    if (!data?.badges) return [];
    const q = search.trim().toLowerCase();
    return data.badges.filter((badge) => {
      if (category !== 'All' && badge.category !== category) return false;
      if (stateFilter !== 'All' && badge.state !== stateFilter) return false;
      if (q) {
        const haystack = `${badge.name} ${badge.description} ${badge.achievementCriteria} ${badge.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, category, stateFilter, search]);

  const handleRedeem = async (badge) => {
    setRedeemingId(badge.badgeId);
    try {
      const res = await apiRequest(`/api/achievements/badges/${badge.badgeId}/redeem`, {
        method: 'POST',
      });
      toast.success(res.message || `${badge.name} redeemed!`);
      await Promise.all([loadAchievements({ silent: true }), refreshUser()]);
      if (res.userBadge) {
        setSelectedCertBadge({
          ...badge,
          state: 'Earned',
          earnedBadge: res.userBadge,
        });
      }
    } catch (err) {
      toast.error(err.message || 'Unable to redeem badge.');
    } finally {
      setRedeemingId('');
    }
  };

  const handleSubmitSpecialRequest = async (e) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      const res = await apiRequest('/api/achievements/requests', {
        method: 'POST',
        body: {
          requestType,
          title: reqTitle,
          category: reqCategory,
          description: reqDescription,
          evidenceUrl: reqEvidenceUrl,
        },
      });
      toast.success(res.message || 'Submitted for admin verification.');
      setReqTitle('');
      setReqDescription('');
      setReqEvidenceUrl('');
      setShowRequestForm(false);
      loadAchievements({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Unable to submit contribution request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <AppLayout
      title="Achievements & Verified Badges"
      subtitle="Permanent verified Achievement XP, redeemable badge credentials, and contribution history"
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
        <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/40 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => loadAchievements()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Total XP Earned</p>
              <p className="font-mono text-2xl font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                {data.summary.totalXp} XP
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8]">Permanent · never deducted</p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Badges Earned</p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
                {data.summary.totalBadgesEarned}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8]">Verified credentials issued</p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Redeemable Now</p>
              <p className="font-mono text-2xl font-semibold text-emerald-700 dark:text-[#2DD4BF] tabular-nums">
                {data.summary.redeemableCount}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8]">Ready to claim free</p>
            </div>
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Badge Catalog</p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
                {data.summary.availableBadges}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8]">{data.summary.lockedCount} locked</p>
            </div>
          </div>

          {/* Upcoming Badge Progress & Verified Contribution Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
              {data.nextUpcoming ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Next Badge Milestone</p>
                      <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC] mt-0.5">
                        {data.nextUpcoming.name} ({data.nextUpcoming.category})
                      </h2>
                    </div>
                    <span className="font-mono text-xs font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                      {data.summary.totalXp} / {data.nextUpcoming.xpThreshold} XP
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-[#111827] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-[#818CF8] rounded-full transition-all duration-300"
                      style={{ width: `${data.nextUpcoming.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                    {data.nextUpcoming.xpRemaining} more verified XP needed to unlock {data.nextUpcoming.name}.
                  </p>
                </>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Milestone Progress</p>
                  <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    All active XP badge thresholds reached
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    Redeem any remaining badges below or view your verified certificates.
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Verified Contribution Statistics
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-zinc-500 dark:text-[#94A3B8]">Sessions</p>
                  <p className="font-mono text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                    {data.contributionStats.completedSessions}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-[#94A3B8]">Peers Helped</p>
                  <p className="font-mono text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                    {data.contributionStats.distinctStudentsHelped}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-[#94A3B8]">Good Feedback</p>
                  <p className="font-mono text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                    {data.contributionStats.positiveFeedbackCount}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-[#94A3B8]">Resources / Talks</p>
                  <p className="font-mono text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                    {data.contributionStats.approvedResourcesCount +
                      data.contributionStats.approvedWorkshopsCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Badge Search & Filter Toolbar */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">Badge Collection</h2>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                  Redeem unlocked badges for shareable QR-verified certificates without spending XP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 transition-colors whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Resource / Workshop XP</span>
              </button>
            </div>

            {showRequestForm && (
              <form
                onSubmit={handleSubmitSpecialRequest}
                className="bg-white dark:bg-[#1E293B] border border-indigo-200 dark:border-[#818CF8]/40 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Submit Verified Contribution for Admin Review
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="text-xs text-zinc-500 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                      Contribution Type
                    </label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    >
                      <option value="approved_resource">Learning Resource (+25 XP)</option>
                      <option value="approved_workshop">Workshop Hosting (+50 XP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">Category</label>
                    <select
                      value={reqCategory}
                      onChange={(e) => setReqCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    >
                      <option value="Learning">Learning</option>
                      <option value="Mentoring">Mentoring</option>
                      <option value="DSA">DSA</option>
                      <option value="Community">Community</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                      Evidence URL (optional)
                    </label>
                    <input
                      type="url"
                      value={reqEvidenceUrl}
                      onChange={(e) => setReqEvidenceUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Dynamic Programming Patterns Cheatsheet or Git Branching Campus Workshop"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                    Description &amp; Impact
                  </label>
                  <textarea
                    required
                    minLength={15}
                    rows={3}
                    value={reqDescription}
                    onChange={(e) => setReqDescription(e.target.value)}
                    placeholder="Describe the resource or workshop, topics covered, and how students benefited."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] disabled:opacity-60 transition-colors"
                  >
                    {submittingRequest ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-zinc-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search badges by name, skill, or criteria..."
                    aria-label="Search badges"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                  />
                </div>

                <div className="md:col-span-7 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#111827] border border-transparent dark:border-[#334155] rounded-lg">
                    {CATEGORY_FILTERS.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          category === cat
                            ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                            : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#111827] border border-transparent dark:border-[#334155] rounded-lg">
                    {STATE_FILTERS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStateFilter(st)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          stateFilter === st
                            ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                            : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {filteredBadges.length === 0 ? (
              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-8 text-center text-sm text-zinc-600 dark:text-[#94A3B8]">
                No badges match the current search or category filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBadges.map((badge) => {
                  const isEarned = badge.state === 'Earned';
                  const isRevoked = badge.earnedBadge?.status === 'revoked';
                  const isRedeemable = badge.state === 'Redeemable';

                  return (
                    <article
                      key={badge.badgeId}
                      className={`bg-white dark:bg-[#1E293B] border rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors ${
                        isRedeemable
                          ? 'border-indigo-300 dark:border-[#818CF8]/60'
                          : isEarned && !isRevoked
                          ? 'border-emerald-200 dark:border-[#2DD4BF]/40'
                          : 'border-zinc-200 dark:border-[#334155]'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                              isEarned && !isRevoked
                                ? 'bg-emerald-50 dark:bg-[#2DD4BF]/15 border-emerald-200 dark:border-[#2DD4BF]/35 text-emerald-700 dark:text-[#2DD4BF]'
                                : isRedeemable
                                ? 'bg-indigo-50 dark:bg-[#818CF8]/15 border-indigo-200 dark:border-[#818CF8]/35 text-indigo-700 dark:text-[#818CF8]'
                                : 'bg-zinc-50 dark:bg-[#111827] border-zinc-200 dark:border-[#334155] text-zinc-500 dark:text-[#94A3B8]'
                            }`}
                          >
                            <BadgeIcon icon={badge.icon} className="w-5 h-5" />
                          </div>

                          <div className="text-right text-xs">
                            <span
                              className={
                                isRevoked
                                  ? 'text-rose-700 dark:text-rose-300 font-semibold'
                                  : isEarned
                                  ? 'text-emerald-700 dark:text-[#2DD4BF] font-semibold'
                                  : isRedeemable
                                  ? 'text-indigo-700 dark:text-[#818CF8] font-semibold'
                                  : 'text-zinc-500 dark:text-[#94A3B8] font-medium'
                              }
                            >
                              {isRevoked ? 'Revoked' : badge.state}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
                            <span>{badge.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {badge.unlockType === 'milestone' ? 'Milestone' : `${badge.xpThreshold} XP`}
                            </span>
                          </div>
                          <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                            {badge.name}
                          </h3>
                          <p className="text-xs text-zinc-600 dark:text-[#94A3B8] leading-relaxed">{badge.description}</p>
                        </div>

                        <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] leading-relaxed">
                          {badge.achievementCriteria}
                        </p>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                            <span>Progress</span>
                            <span className="font-mono">
                              {badge.unlockType === 'milestone'
                                ? isEarned
                                  ? 'Completed'
                                  : 'Skill Growth'
                                : `${Math.min(data.summary.totalXp, badge.xpThreshold)} / ${badge.xpThreshold} XP`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-100 dark:bg-[#111827] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isEarned && !isRevoked ? 'bg-emerald-600 dark:bg-[#2DD4BF]' : 'bg-indigo-600 dark:bg-[#818CF8]'
                              }`}
                              style={{ width: `${badge.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-100 dark:border-[#334155] flex items-center justify-between gap-2">
                        {isEarned ? (
                          isRevoked ? (
                            <span className="text-xs text-rose-700 dark:text-rose-300">
                              Credential {badge.earnedBadge?.credentialId} revoked
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedCertBadge(badge)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] transition-colors"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Certificate &amp; Share</span>
                              </button>
                              <Link
                                to={`/verify/${encodeURIComponent(badge.earnedBadge?.credentialId)}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]"
                              >
                                <span>Verify</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </>
                          )
                        ) : isRedeemable ? (
                          <button
                            type="button"
                            disabled={redeemingId === badge.badgeId}
                            onClick={() => handleRedeem(badge)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] disabled:opacity-60 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {redeemingId === badge.badgeId ? 'Redeeming...' : 'Redeem Badge'}
                            </span>
                          </button>
                        ) : badge.unlockType === 'milestone' ? (
                          <Link
                            to="/skill-growth"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:underline"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock in Skill Growth</span>
                          </Link>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-[#94A3B8]">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="tabular-nums">{badge.xpRemaining} XP remaining</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* How XP is Earned + Special Requests Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-6 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Verified XP Earning Rules
              </h2>
              <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                {data.rules.map((rule) => (
                  <div key={rule.ruleKey} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC]">{rule.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">{rule.description}</p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-indigo-700 dark:text-[#818CF8] shrink-0 tabular-nums">
                      +{rule.xpAmount} XP
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="lg:col-span-6 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Submitted Resource &amp; Workshop Requests
              </h2>
              {data.specialRequests.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                  No resource or workshop submissions yet. Submit verified contributions using the button above.
                </p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                  {data.specialRequests.map((req) => (
                    <div key={req._id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC] truncate">{req.title}</p>
                        <span
                          className={`text-xs font-medium shrink-0 ${
                            req.status === 'Approved'
                              ? 'text-emerald-700 dark:text-[#2DD4BF]'
                              : req.status === 'Rejected'
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {req.status}
                          {req.xpAwarded > 0 ? ` (+${req.xpAwarded} XP)` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                        {req.requestType === 'approved_workshop' ? 'Workshop' : 'Learning Resource'} · {req.category} ·{' '}
                        {formatDateTime(req.createdAt)}
                      </p>
                      {req.reviewNote && (
                        <p className="text-xs text-zinc-600 dark:text-[#94A3B8]">Reviewer note: {req.reviewNote}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Recent Verified XP Transaction History */}
          <section className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-[#334155]">
              <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Recent XP Transaction History
              </h2>
            </div>

            {data.transactions.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500 dark:text-[#94A3B8] text-center">
                No Achievement XP transactions recorded yet. Complete a mentoring session to earn your first +20 XP.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-[#334155] bg-zinc-50/70 dark:bg-[#111827] text-xs font-medium text-zinc-500 dark:text-[#94A3B8]">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Activity</th>
                      <th className="py-2.5 px-4 hidden sm:table-cell">Status</th>
                      <th className="py-2.5 px-4 text-right">XP Change</th>
                      <th className="py-2.5 px-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-[#334155] text-xs">
                    {data.transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-zinc-50/60 dark:hover:bg-[#273449]/60 transition-colors">
                        <td className="py-3 px-4 text-zinc-500 dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-zinc-900 dark:text-[#F8FAFC]">
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-[11px] text-zinc-400 dark:text-slate-500 font-mono">{tx.referenceKey}</p>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              tx.status === 'verified'
                                ? 'text-emerald-700 dark:text-[#2DD4BF]'
                                : tx.status === 'flagged'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {tx.status === 'verified' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>{tx.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                          +{tx.xpDelta} XP
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-700 dark:text-slate-200 tabular-nums">
                          {tx.balanceAfter} XP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {selectedCertBadge && (
        <CertificateModal
          badge={selectedCertBadge}
          recipientName={user?.fullName || 'QuickFix Student'}
          onClose={() => setSelectedCertBadge(null)}
        />
      )}
    </AppLayout>
  );
}
