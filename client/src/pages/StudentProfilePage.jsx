import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Edit3, Award, Calendar, GraduationCap, ShieldCheck, ExternalLink } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { BadgeIcon } from '../components/BadgeIcon.jsx';
import { CertificateModal } from '../components/CertificateModal.jsx';
import { apiRequest } from '../services/api.js';
import { formatRelativeTime } from '../utils/time.js';
import { getStatusLabelStyle } from '../utils/badges.js';

export function StudentProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCredential, setSelectedCredential] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest(`/api/users/${id}`);
        if (active) setProfile(data.profile);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load profile.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <AppLayout title="Student Profile" subtitle="Skills, mentoring track record, and earned badges">
      {loading ? (
        <div className="h-72 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse" />
      ) : error ? (
        <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/40 rounded-xl p-6 text-center text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <Avatar src={profile.avatarUrl} name={profile.fullName} size="xl" />
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-[#F8FAFC]">
                    {profile.fullName}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-[#94A3B8]">
                    {(profile.college || profile.branch || profile.academicYear) && (
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-zinc-400 dark:text-slate-500" />
                        <span>
                          {[profile.branch, profile.academicYear, profile.college].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-[#94A3B8]">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-500" />
                      <span>
                        Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </span>
                  </div>

                  {profile.bio ? (
                    <p className="text-sm text-zinc-700 dark:text-slate-300 max-w-2xl leading-relaxed pt-1">{profile.bio}</p>
                  ) : (
                    <p className="text-sm text-zinc-400 dark:text-slate-500 pt-1">No bio added yet.</p>
                  )}
                </div>
              </div>

              {profile.isOwner && (
                <Link
                  to="/profile/edit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile & Skills</span>
                </Link>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-[#334155] grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Contribution Points</p>
                <p className="font-mono text-2xl font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums mt-0.5">
                  {profile.contributionPoints || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Achievement XP</p>
                <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                  {profile.achievementXp || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Completed Sessions</p>
                <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                  {profile.completedSessions || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Listed Skills</p>
                <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                  {profile.skills?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Skills & Badges */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">Skills & Proficiency</h3>
                  {profile.isOwner && (
                    <Link to="/profile/edit" className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]">
                      Manage
                    </Link>
                  )}
                </div>

                {profile.skills?.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-[#94A3B8]">No skills added yet.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                    {profile.skills.map((s) => (
                      <div key={s._id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC]">{s.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">{s.category}</p>
                        </div>
                        <span className="text-xs font-medium text-indigo-700 dark:text-[#818CF8]">{s.proficiency}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" />
                    <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                      Verified Credentials
                    </h3>
                  </div>
                  {profile.isOwner && (
                    <Link to="/achievements" className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]">
                      Achievements
                    </Link>
                  )}
                </div>

                {!profile.redeemedBadges || profile.redeemedBadges.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-[#94A3B8]">
                    No verified credentials redeemed yet.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                    {profile.redeemedBadges.map((badge) => (
                      <div key={badge.credentialId} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-[#818CF8]/15 text-indigo-600 dark:text-[#818CF8] flex items-center justify-center shrink-0">
                            <BadgeIcon name={badge.icon} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC] truncate">{badge.badgeName}</p>
                            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                              {badge.category} · Issued{' '}
                              {new Date(badge.issuedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="font-mono text-[11px] text-zinc-500 dark:text-[#94A3B8] truncate">{badge.credentialId}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedCredential(badge)}
                            className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            Certificate
                          </button>
                          <Link
                            to={`/verify/${badge.credentialId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-transparent dark:border-[#818CF8]/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 transition-colors"
                          >
                            <span>Verify</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" />
                  <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">Skill Milestones</h3>
                </div>

                {profile.badges?.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-[#94A3B8]">
                    Complete mentoring sessions or add verified skills to unlock milestones.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                    {profile.badges.map((badge) => (
                      <div key={badge.id} className="py-2.5 first:pt-0 last:pb-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">{badge.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">{badge.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Doubts */}
            <div className="lg:col-span-6 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 space-y-4">
              <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">Recent Doubts Posted</h3>
              {profile.recentRequests?.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-[#94A3B8]">No doubts posted yet.</p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                  {profile.recentRequests.map((req) => (
                    <div key={req._id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <Link
                        to={`/doubts/${req._id}`}
                        className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC] hover:text-indigo-700 dark:hover:text-[#818CF8] block"
                      >
                        {req.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
                        <span>{req.skillId?.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className={getStatusLabelStyle(req.status)}>{req.status}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatRelativeTime(req.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedCredential && profile && (
        <CertificateModal
          badge={selectedCredential}
          recipientName={profile.fullName}
          onClose={() => setSelectedCredential(null)}
        />
      )}
    </AppLayout>
  );
}
