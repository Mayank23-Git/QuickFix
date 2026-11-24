import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  KeyRound,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiRequest } from '../services/api.js';
import { formatDateTime } from '../utils/time.js';

const ADMIN_TABS = [
  { id: 'badges', label: 'Badges' },
  { id: 'rules', label: 'XP Rules' },
  { id: 'requests', label: 'Special Requests' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'audit', label: 'Ledger & Fraud' },
];

export function AdminAchievementsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [bootstrap, setBootstrap] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [claiming, setClaiming] = useState(false);

  const [tab, setTab] = useState('badges');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // New badge form
  const [newBadge, setNewBadge] = useState({
    badgeId: '',
    name: '',
    description: '',
    achievementCriteria: '',
    xpThreshold: 300,
    category: 'Mentoring',
    icon: 'award',
    active: true,
  });
  const [creatingBadge, setCreatingBadge] = useState(false);
  const [editingBadgeId, setEditingBadgeId] = useState('');
  const [badgeEdits, setBadgeEdits] = useState({});
  const [ruleEdits, setRuleEdits] = useState({});
  const [revokeReasons, setRevokeReasons] = useState({});
  const [requestNotes, setRequestNotes] = useState({});

  const isAdmin = user?.role === 'admin';

  const loadBootstrapAndOverview = useCallback(async () => {
    setLoading(true);
    try {
      const status = await apiRequest('/api/admin/bootstrap-status');
      setBootstrap(status);
      if (status.isAdmin) {
        const ov = await apiRequest('/api/admin/overview');
        setOverview(ov);
      }
    } catch (err) {
      toast.error(err.message || 'Unable to load admin workspace.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBootstrapAndOverview();
  }, [loadBootstrapAndOverview]);

  const handleClaimAdmin = async (e) => {
    e.preventDefault();
    setClaiming(true);
    try {
      const res = await apiRequest('/api/admin/claim', {
        method: 'POST',
        body: { passcode },
      });
      toast.success(res.message || 'Admin access verified.');
      setPasscode('');
      await refreshUser();
      await loadBootstrapAndOverview();
    } catch (err) {
      toast.error(err.message || 'Admin verification failed.');
    } finally {
      setClaiming(false);
    }
  };

  const handleCreateBadge = async (e) => {
    e.preventDefault();
    setCreatingBadge(true);
    try {
      await apiRequest('/api/admin/badges', {
        method: 'POST',
        body: newBadge,
      });
      toast.success('New badge created.');
      setNewBadge({
        badgeId: '',
        name: '',
        description: '',
        achievementCriteria: '',
        xpThreshold: 300,
        category: 'Mentoring',
        icon: 'award',
        active: true,
      });
      await loadBootstrapAndOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to create badge.');
    } finally {
      setCreatingBadge(false);
    }
  };

  const handleSaveBadge = async (badge) => {
    const patch = badgeEdits[badge._id] || {};
    try {
      await apiRequest(`/api/admin/badges/${badge._id}`, {
        method: 'PATCH',
        body: patch,
      });
      toast.success(`${badge.name} updated.`);
      setEditingBadgeId('');
      await loadBootstrapAndOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to update badge.');
    }
  };

  const handleToggleBadgeActive = async (badge) => {
    try {
      await apiRequest(`/api/admin/badges/${badge._id}`, {
        method: 'PATCH',
        body: { active: !badge.active },
      });
      toast.info(`${badge.name} is now ${!badge.active ? 'active' : 'inactive'}.`);
      await loadBootstrapAndOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to toggle badge.');
    }
  };

  const handleSaveRule = async (rule) => {
    const patch = ruleEdits[rule.ruleKey] || {};
    try {
      await apiRequest(`/api/admin/rules/${rule.ruleKey}`, {
        method: 'PATCH',
        body: patch,
      });
      toast.success(`Rule "${rule.name}" updated.`);
      await loadBootstrapAndOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to update rule.');
    }
  };

  const handleReviewSpecial = async (reqId, decision) => {
    try {
      const res = await apiRequest(`/api/admin/requests/${reqId}/review`, {
        method: 'POST',
        body: {
          decision,
          reviewNote: requestNotes[reqId] || '',
        },
      });
      toast.success(res.message || 'Review saved.');
      await loadBootstrapAndOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to review request.');
    }
  };

  const handleRevokeCredential = async (credentialId) => {
    const reason = (revokeReasons[credentialId] || '').trim();
    if (reason.length < 6) {
      toast.error('Please enter an audit reason (at least 6 characters).');
      return;
    }
    try {
      const res = await apiRequest(`/api/admin/credentials/${encodeURIComponent(credentialId)}/revoke`, {
        method: 'POST',
        body: { reason },
      });
      toast.info(res.message || 'Credential revoked.');
      await loadBootstrapAndOverview();
    } catch (err) {
      toast.error(err.message || 'Unable to revoke credential.');
    }
  };

  const handleReviewFeedback = async (feedbackId, action) => {
    try {
      const res = await apiRequest(`/api/admin/feedback/${feedbackId}/review`, {
        method: 'POST',
        body: { action },
      });
      toast.success(res.message || 'Feedback reviewed.');
      await loadBootstrapAndOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to review feedback.');
    }
  };

  return (
    <AppLayout
      title="Achievements Admin Console"
      subtitle="Manage badge thresholds, XP rules, contribution approvals, and credential integrity"
    >
      {loading ? (
        <div className="h-72 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse" />
      ) : !isAdmin ? (
        <div className="max-w-lg mx-auto bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 flex items-center justify-center text-indigo-700 dark:text-[#818CF8]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Administrator Access Required
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                {bootstrap?.canClaimWithEmail
                  ? 'Your account email is authorized to unlock administrator controls.'
                  : bootstrap?.hasConfiguredPasscode
                  ? 'Enter the administrator passcode to manage badges, XP rules, and credentials.'
                  : 'First-run setup: establish an administrator passcode (min. 8 characters) to claim admin controls.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleClaimAdmin} className="space-y-4">
            {!bootstrap?.canClaimWithEmail && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                  {bootstrap?.hasConfiguredPasscode
                    ? 'Administrator Passcode'
                    : 'Choose Initial Administrator Passcode'}
                </label>
                <input
                  type="password"
                  required
                  minLength={bootstrap?.hasConfiguredPasscode ? 1 : 8}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={claiming}
              className="w-full py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] disabled:opacity-60 transition-colors"
            >
              {claiming ? 'Verifying...' : 'Unlock Admin Console'}
            </button>
          </form>
        </div>
      ) : overview ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#111827] border border-transparent dark:border-[#334155] rounded-lg w-fit" role="tablist">
            {ADMIN_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                    : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'badges' && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateBadge}
                className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" />
                  <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Add New Badge Definition
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">Badge Name</label>
                    <input
                      type="text"
                      required
                      value={newBadge.name}
                      onChange={(e) => setNewBadge((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Graph Theory Guide"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                      Unique Badge ID (slug)
                    </label>
                    <input
                      type="text"
                      value={newBadge.badgeId}
                      onChange={(e) => setNewBadge((p) => ({ ...p, badgeId: e.target.value }))}
                      placeholder="graph-theory-guide"
                      className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                      XP Threshold
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newBadge.xpThreshold}
                      onChange={(e) =>
                        setNewBadge((p) => ({ ...p, xpThreshold: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">Category</label>
                    <select
                      value={newBadge.category}
                      onChange={(e) => setNewBadge((p) => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    >
                      <option value="Mentoring">Mentoring</option>
                      <option value="DSA">DSA</option>
                      <option value="Community">Community</option>
                      <option value="Learning">Learning</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">Description</label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={newBadge.description}
                      onChange={(e) => setNewBadge((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Short badge summary shown on dashboard and certificate"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                      Achievement Criteria
                    </label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={newBadge.achievementCriteria}
                      onChange={(e) =>
                        setNewBadge((p) => ({ ...p, achievementCriteria: e.target.value }))
                      }
                      placeholder="Criteria displayed on public verification page"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingBadge}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] disabled:opacity-60 transition-colors"
                  >
                    {creatingBadge ? 'Creating...' : 'Create Badge'}
                  </button>
                </div>
              </form>

              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl divide-y divide-zinc-100 dark:divide-[#334155]">
                {overview.badges.map((badge) => {
                  const isEditing = editingBadgeId === badge._id;
                  const draft = badgeEdits[badge._id] || badge;
                  return (
                    <div key={badge._id} className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
                            <span className="font-mono">{badge.badgeId}</span>
                            <span aria-hidden="true">·</span>
                            <span>{badge.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{badge.xpThreshold} XP</span>
                            <span aria-hidden="true">·</span>
                            <span className={badge.active ? 'text-emerald-700 dark:text-[#2DD4BF] font-medium' : 'text-zinc-400 dark:text-slate-500'}>
                              {badge.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">{badge.name}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleBadgeActive(badge)}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            {badge.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBadgeId(isEditing ? '' : badge._id);
                              setBadgeEdits((p) => ({
                                ...p,
                                [badge._id]: {
                                  name: badge.name,
                                  description: badge.description,
                                  achievementCriteria: badge.achievementCriteria,
                                  xpThreshold: badge.xpThreshold,
                                  category: badge.category,
                                },
                              }));
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 transition-colors"
                          >
                            {isEditing ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                          <input
                            type="text"
                            value={draft.name}
                            onChange={(e) =>
                              setBadgeEdits((p) => ({
                                ...p,
                                [badge._id]: { ...draft, name: e.target.value },
                              }))
                            }
                            className="px-3 py-1.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg"
                          />
                          <input
                            type="number"
                            min={1}
                            value={draft.xpThreshold}
                            onChange={(e) =>
                              setBadgeEdits((p) => ({
                                ...p,
                                [badge._id]: { ...draft, xpThreshold: Number(e.target.value) },
                              }))
                            }
                            className="px-3 py-1.5 text-sm font-mono bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg"
                          />
                          <select
                            value={draft.category}
                            onChange={(e) =>
                              setBadgeEdits((p) => ({
                                ...p,
                                [badge._id]: { ...draft, category: e.target.value },
                              }))
                            }
                            className="px-3 py-1.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg"
                          >
                            <option value="Mentoring">Mentoring</option>
                            <option value="DSA">DSA</option>
                            <option value="Community">Community</option>
                            <option value="Learning">Learning</option>
                          </select>
                          <input
                            type="text"
                            value={draft.description}
                            onChange={(e) =>
                              setBadgeEdits((p) => ({
                                ...p,
                                [badge._id]: { ...draft, description: e.target.value },
                              }))
                            }
                            className="md:col-span-2 px-3 py-1.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveBadge(badge)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] transition-colors"
                          >
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'rules' && (
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl divide-y divide-zinc-100 dark:divide-[#334155]">
              {overview.rules.map((rule) => {
                const draft = ruleEdits[rule.ruleKey] || rule;
                return (
                  <div
                    key={rule.ruleKey}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                        {rule.name} <span className="font-mono text-xs text-zinc-400 dark:text-slate-500">({rule.ruleKey})</span>
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-[#94A3B8]">{rule.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={draft.xpAmount}
                        onChange={(e) =>
                          setRuleEdits((p) => ({
                            ...p,
                            [rule.ruleKey]: { ...draft, xpAmount: Number(e.target.value) },
                          }))
                        }
                        aria-label={`XP amount for ${rule.name}`}
                        className="w-24 px-2.5 py-1.5 text-sm font-mono bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg"
                      />
                      <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={draft.active}
                          onChange={(e) =>
                            setRuleEdits((p) => ({
                              ...p,
                              [rule.ruleKey]: { ...draft, active: e.target.checked },
                            }))
                          }
                          className="rounded border-zinc-300 dark:border-[#334155] dark:bg-[#111827] text-indigo-600 dark:text-[#818CF8]"
                        />
                        <span>Active</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSaveRule(rule)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'requests' && (
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl divide-y divide-zinc-100 dark:divide-[#334155]">
              {overview.specialRequests.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500 dark:text-[#94A3B8]">
                  No special resource or workshop requests submitted yet.
                </div>
              ) : (
                overview.specialRequests.map((req) => (
                  <div key={req._id} className="p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
                          <span className="font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                            {req.userId?.fullName} ({req.userId?.email})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {req.requestType === 'approved_workshop'
                              ? 'Workshop (+50 XP)'
                              : 'Resource (+25 XP)'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{req.category}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">{req.title}</h3>
                        <p className="text-xs text-zinc-600 dark:text-[#94A3B8]">{req.description}</p>
                        {req.evidenceUrl && (
                          <a
                            href={req.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 dark:text-[#818CF8] hover:underline inline-block"
                          >
                            {req.evidenceUrl}
                          </a>
                        )}
                      </div>

                      <span
                        className={`text-xs font-semibold ${
                          req.status === 'Approved'
                            ? 'text-emerald-700 dark:text-[#2DD4BF]'
                            : req.status === 'Rejected'
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    {req.status === 'Pending' && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-[#334155]">
                        <input
                          type="text"
                          value={requestNotes[req._id] || ''}
                          onChange={(e) =>
                            setRequestNotes((p) => ({ ...p, [req._id]: e.target.value }))
                          }
                          placeholder="Optional review note..."
                          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleReviewSpecial(req._id, 'approve')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white dark:text-[#0F172A] bg-emerald-600 dark:bg-[#2DD4BF] rounded-lg hover:bg-emerald-700 dark:hover:bg-[#5EEAD4] transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve &amp; Award XP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewSpecial(req._id, 'reject')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/35 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'credentials' && (
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl divide-y divide-zinc-100 dark:divide-[#334155]">
              {overview.credentials.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500 dark:text-[#94A3B8]">
                  No credentials issued yet.
                </div>
              ) : (
                overview.credentials.map((cred) => (
                  <div key={cred._id} className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
                          <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-[#818CF8]" />
                          <span className="font-mono text-zinc-800 dark:text-slate-200">{cred.credentialId}</span>
                          <span aria-hidden="true">·</span>
                          <span>{cred.recipientDisplayName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDateTime(cred.issuedAt)}</span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">{cred.credentialName}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          to={`/verify/${encodeURIComponent(cred.credentialId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:underline"
                        >
                          Verify Page
                        </Link>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            cred.status === 'valid' ? 'text-emerald-700 dark:text-[#2DD4BF]' : 'text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {cred.status === 'valid' ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                          <span>{cred.status}</span>
                        </span>
                      </div>
                    </div>

                    {cred.status === 'valid' ? (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-[#334155]">
                        <input
                          type="text"
                          value={revokeReasons[cred.credentialId] || ''}
                          onChange={(e) =>
                            setRevokeReasons((p) => ({
                              ...p,
                              [cred.credentialId]: e.target.value,
                            }))
                          }
                          placeholder="Audit reason required to revoke credential..."
                          className="flex-1 min-w-[220px] px-3 py-1.5 text-xs bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRevokeCredential(cred.credentialId)}
                          className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/35 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-colors"
                        >
                          Revoke Credential
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-rose-700 dark:text-rose-300">
                        Revocation reason: {cred.revocationReason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div className="space-y-6">
              {/* Suspicious Activity / Flagged Feedback */}
              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Suspicious Activity &amp; Flagged Feedback
                  </h2>
                </div>
                {overview.flaggedFeedback.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">No flagged feedback alerts right now.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                    {overview.flaggedFeedback.map((fb) => (
                      <div key={fb._id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5 text-xs">
                          <p className="font-medium text-zinc-900 dark:text-[#F8FAFC]">
                            {fb.requesterId?.fullName} → {fb.helperId?.fullName} ({fb.rating}/5)
                          </p>
                          <p className="text-amber-700 dark:text-amber-300">{fb.flagReason}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewFeedback(fb._id, 'approve')}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-[#2DD4BF] bg-emerald-50 dark:bg-[#2DD4BF]/15 border border-emerald-200 dark:border-[#2DD4BF]/35 rounded-lg hover:bg-emerald-100 dark:hover:bg-[#2DD4BF]/25 transition-colors"
                          >
                            Clear &amp; Award XP
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewFeedback(fb._id, 'dismiss')}
                            className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/35 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-colors"
                          >
                            Dismiss Abuse
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* XP Ledger */}
              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-200 dark:border-[#334155]">
                  <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    System XP Transactions
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-[#334155] bg-zinc-50/70 dark:bg-[#111827] text-zinc-500 dark:text-[#94A3B8]">
                        <th className="py-2.5 px-4">Student</th>
                        <th className="py-2.5 px-4">Rule / Description</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">XP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-[#334155]">
                      {overview.transactions.map((tx) => (
                        <tr key={tx._id} className="hover:bg-zinc-50/60 dark:hover:bg-[#273449]/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-zinc-900 dark:text-[#F8FAFC]">
                            {tx.userId?.fullName}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-600 dark:text-[#94A3B8]">
                            {tx.description}{' '}
                            <span className="font-mono text-[11px] text-zinc-400 dark:text-slate-500">
                              ({tx.referenceKey})
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-700 dark:text-slate-200">{tx.status}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                            +{tx.xpDelta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
                <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  Administrator Audit Logs
                </h2>
                {overview.auditLogs.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">No audit logs recorded yet.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-[#334155] text-xs">
                    {overview.auditLogs.map((log) => (
                      <div key={log._id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-semibold text-zinc-800 dark:text-slate-200">{log.action}</span>{' '}
                          <span className="text-zinc-500 dark:text-[#94A3B8]">
                            by {log.actorId?.fullName} on {log.targetType}:{log.targetId}
                          </span>
                          {log.reason && <p className="text-zinc-600 dark:text-[#94A3B8] mt-0.5">Reason: {log.reason}</p>}
                        </div>
                        <span className="text-zinc-400 dark:text-slate-500 tabular-nums">{formatDateTime(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </AppLayout>
  );
}
