import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { CardSkeleton } from '../components/Skeletons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiRequest } from '../services/api.js';
import { formatRelativeTime } from '../utils/time.js';
import { SkillChartsSection } from '../components/skill-growth/SkillChartsSection.jsx';
import { LearningStreakCard } from '../components/skill-growth/LearningStreakCard.jsx';
import { LearningRoadmapSection } from '../components/skill-growth/LearningRoadmapSection.jsx';
import { AiRecommendationsSection } from '../components/skill-growth/AiRecommendationsSection.jsx';
import { LogActivityModal } from '../components/skill-growth/LogActivityModal.jsx';
import { SkillManagerModal } from '../components/skill-growth/SkillManagerModal.jsx';

const MILESTONE_ITEMS = [
  { badgeId: 'first-learning-activity', title: 'First Learning Activity', target: '1 activity' },
  { badgeId: 'streak-3-days', title: '3-Day Learning Streak', target: '3 consecutive days' },
  { badgeId: 'streak-7-days', title: '7-Day Learning Streak', target: '7 consecutive days' },
  { badgeId: 'streak-30-days', title: '30-Day Learning Streak', target: '30 consecutive days' },
  { badgeId: 'first-skill-goal-completed', title: 'First Skill Goal Completed', target: '1 completed goal' },
  { badgeId: 'five-skills-improved', title: '5 Skills Improved', target: '5 skills improved' },
];

export function SkillGrowthPage() {
  const { refreshUser } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('weekly');
  const [loadingRange, setLoadingRange] = useState(false);

  const [careerGoal, setCareerGoal] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [editingGoalsBanner, setEditingGoalsBanner] = useState(false);
  const [savingCareerGoal, setSavingCareerGoal] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [editingSkillGoal, setEditingSkillGoal] = useState(null);

  const loadDashboard = useCallback(
    async ({ silent = false, chartRange = range } = {}) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        const res = await apiRequest(`/api/skill-growth/dashboard?range=${chartRange}&tz=${tz}`);
        setData(res);
        setCareerGoal(res.profile?.careerGoal || '');
        setInterestsText((res.profile?.learningInterests || []).join(', '));
      } catch (err) {
        if (!silent) setError(err.message || 'Unable to load Skill Gap Analyzer.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [range]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRangeChange = async (nextRange) => {
    setRange(nextRange);
    setLoadingRange(true);
    try {
      const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      const res = await apiRequest(`/api/skill-growth/charts?range=${nextRange}&tz=${tz}`);
      setData((prev) => (prev ? { ...prev, charts: res.charts } : prev));
    } catch (err) {
      toast.error(err.message || 'Could not update chart range.');
    } finally {
      setLoadingRange(false);
    }
  };

  const handleSaveCareerGoals = async (e) => {
    e.preventDefault();
    setSavingCareerGoal(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const interests = interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiRequest('/api/skill-growth/profile-goals', {
        method: 'PATCH',
        body: { careerGoal: careerGoal.trim(), learningInterests: interests, timezone: tz },
      });
      toast.success(res.message || 'Career goal & interests updated.');
      setEditingGoalsBanner(false);
      await Promise.all([loadDashboard({ silent: true }), refreshUser()]);
    } catch (err) {
      toast.error(err.message || 'Failed to save learning goals.');
    } finally {
      setSavingCareerGoal(false);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await apiRequest('/api/skill-growth/recommendations', {
        method: 'POST',
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              recommendations: res.recommendations,
              goals: res.goals || prev.goals,
            }
          : prev
      );
      toast.success(res.message || 'Recommendations updated.');
    } catch (err) {
      toast.error(err.message || 'Unable to analyze skills right now.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAfterMutation = async () => {
    await Promise.all([loadDashboard({ silent: true }), refreshUser()]);
  };

  const unlockedSet = new Set((data?.earnedMilestoneBadges || []).map((b) => b.badgeId));

  return (
    <AppLayout
      title="My Skill Growth"
      subtitle="AI Skill Gap Analyzer, interactive charts, personalized roadmaps, and learning streaks"
    >
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse"
              />
            ))}
          </div>
          <CardSkeleton count={4} />
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/40 rounded-xl p-6 text-center space-y-3">
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
          {/* Top Action Bar & Career Goal Card */}
          <section className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-[#818CF8] font-medium">
                  <Target className="w-4 h-4" aria-hidden="true" />
                  <span>Career Target &amp; Learning Interests</span>
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  {data.profile?.careerGoal || 'No career target set yet — set your goal for tailored AI gap insights'}
                </p>
                {data.profile?.learningInterests?.length > 0 && (
                  <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                    Interests: {data.profile.learningInterests.join(' · ')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingGoalsBanner((v) => !v)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  {editingGoalsBanner ? 'Close Goal Editor' : 'Set Career Goal'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSkillGoal(null);
                    setSkillModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Skill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg whitespace-nowrap"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Log Learning Activity</span>
                </button>
              </div>
            </div>

            {editingGoalsBanner && (
              <form
                onSubmit={handleSaveCareerGoals}
                className="pt-4 border-t border-zinc-100 dark:border-[#334155] grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                <div className="md:col-span-5">
                  <label htmlFor="sg-career-goal" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                    Career goal / target role
                  </label>
                  <input
                    id="sg-career-goal"
                    type="text"
                    maxLength={160}
                    value={careerGoal}
                    onChange={(e) => setCareerGoal(e.target.value)}
                    placeholder="e.g. Backend Software Engineer, ML Intern"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                  />
                </div>
                <div className="md:col-span-5">
                  <label htmlFor="sg-interests" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                    Learning interests (comma-separated)
                  </label>
                  <input
                    id="sg-interests"
                    type="text"
                    value={interestsText}
                    onChange={(e) => setInterestsText(e.target.value)}
                    placeholder="e.g. System Design, Dynamic Programming, React"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={savingCareerGoal}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60"
                  >
                    {savingCareerGoal ? 'Saving...' : 'Save Goal'}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Current Streak</span>
              </p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
                {data.streak?.currentStreak || 0}d
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                Best: {data.streak?.longestStreak || 0}d · {data.streak?.totalLearningDays || 0} active days
              </p>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-[#818CF8]" aria-hidden="true" />
                <span>Tracked Skills</span>
              </p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
                {data.summary?.trackedSkillsCount || 0}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                {data.summary?.skillsWithGapCount || 0} with active growth gap
              </p>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-[#2DD4BF]" aria-hidden="true" />
                <span>Study Time</span>
              </p>
              <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
                {data.summary?.totalMinutesStudied || 0}m
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                {data.streak?.totalActivities || 0} completed sessions
              </p>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-[#818CF8]" aria-hidden="true" />
                <span>Goals &amp; Badges</span>
              </p>
              <p className="font-mono text-2xl font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                {data.summary?.completedGoalsCount || 0}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                {unlockedSet.size} / 6 growth badges earned
              </p>
            </div>
          </div>

          {/* Learning Streak & Activity Calendar */}
          <LearningStreakCard
            streak={data.streak}
            onOpenLogActivity={() => setLogModalOpen(true)}
          />

          {/* Interactive 4-Chart Analytics Grid */}
          <SkillChartsSection
            charts={data.charts}
            range={range}
            onRangeChange={handleRangeChange}
            loadingRange={loadingRange}
          />

          {/* AI Recommendations, Peer Mentors & Practice Opportunities */}
          <AiRecommendationsSection
            recommendations={data.recommendations}
            analyzing={analyzing}
            onRunAnalysis={handleRunAnalysis}
          />

          {/* Skill Gap Breakdown & Interactive Learning Roadmaps */}
          <LearningRoadmapSection
            goals={data.goals || []}
            onAddSkill={() => {
              setEditingSkillGoal(null);
              setSkillModalOpen(true);
            }}
            onEditSkill={(goal) => {
              setEditingSkillGoal(goal);
              setSkillModalOpen(true);
            }}
            onRefresh={handleAfterMutation}
          />

          {/* Recent Study Activity Log & Learning Milestone Badges */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" aria-hidden="true" />
                  <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Recent Learning Activities
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setLogModalOpen(true)}
                  className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:underline"
                >
                  + Log new
                </button>
              </div>

              {(data.activities || []).length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                  No study activities logged yet. Record your first study session or complete a roadmap topic to start building history.
                </p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                  {data.activities.slice(0, 8).map((act) => (
                    <div key={act._id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-zinc-900 dark:text-[#F8FAFC]">
                          {act.skillName} — {act.topic}
                        </p>
                        {act.note && (
                          <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] line-clamp-1">{act.note}</p>
                        )}
                        <p className="text-[11px] text-zinc-400 dark:text-slate-500 tabular-nums">
                          {act.dayKey} · {formatRelativeTime(act.createdAt)} ·{' '}
                          {act.completed ? 'Completed' : 'Draft'}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-[#2DD4BF] shrink-0 tabular-nums">
                        {act.durationMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="lg:col-span-5 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-[#2DD4BF]" aria-hidden="true" />
                  <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                    Growth Milestones
                  </h2>
                </div>
                <Link
                  to="/achievements"
                  className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:underline"
                >
                  All badges
                </Link>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                {MILESTONE_ITEMS.map((item) => {
                  const earned = unlockedSet.has(item.badgeId);
                  return (
                    <div key={item.badgeId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            earned
                              ? 'text-emerald-600 dark:text-[#2DD4BF]'
                              : 'text-zinc-300 dark:text-slate-600'
                          }`}
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-medium truncate ${
                              earned
                                ? 'text-zinc-900 dark:text-[#F8FAFC]'
                                : 'text-zinc-500 dark:text-[#94A3B8]'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 dark:text-slate-500">{item.target}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-medium shrink-0 ${
                          earned
                            ? 'text-emerald-700 dark:text-[#2DD4BF]'
                            : 'text-zinc-400 dark:text-slate-500'
                        }`}
                      >
                        {earned ? 'Earned' : 'Locked'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      <LogActivityModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        goals={data?.goals || []}
        catalogSkills={data?.catalogSkills || []}
        onLogged={handleAfterMutation}
      />

      <SkillManagerModal
        isOpen={skillModalOpen}
        editingGoal={editingSkillGoal}
        catalogSkills={data?.catalogSkills || []}
        onClose={() => {
          setSkillModalOpen(false);
          setEditingSkillGoal(null);
        }}
        onSaved={handleAfterMutation}
      />
    </AppLayout>
  );
}
