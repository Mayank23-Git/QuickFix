import { useState } from 'react';
import { CheckCircle2, Circle, Edit3, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const LEVEL_LABELS = {
  1: 'Beginner',
  2: 'Foundations',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

export function LearningRoadmapSection({ goals, onAddSkill, onEditSkill, onRefresh }) {
  const toast = useToast();
  const [busyTopicKey, setBusyTopicKey] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [expandedMap, setExpandedMap] = useState({});

  const toggleExpand = (goalId) => {
    setExpandedMap((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const handleToggleTopic = async (goal, topic) => {
    const key = `${goal._id}:${topic.topicId}`;
    setBusyTopicKey(key);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await apiRequest(`/api/skill-growth/skills/${goal._id}/topics/${topic.topicId}`, {
        method: 'PATCH',
        body: { completed: !topic.completed, timezone: tz },
      });
      toast.success(res.message || 'Roadmap updated.');
      if (res.achievementUpdate?.newlyUnlockedBadges?.length > 0) {
        toast.success(
          `Unlocked badge: ${res.achievementUpdate.newlyUnlockedBadges.map((b) => b.name).join(', ')}`
        );
      }
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Could not update roadmap topic.');
    } finally {
      setBusyTopicKey('');
    }
  };

  const handleDeleteGoal = async (goal) => {
    setDeletingId(goal._id);
    try {
      const res = await apiRequest(`/api/skill-growth/skills/${goal._id}`, {
        method: 'DELETE',
      });
      toast.info(res.message || `${goal.skillName} removed.`);
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Failed to remove skill.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="space-y-4" aria-label="Skill gap roadmap">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
            Skill Gap Breakdown &amp; Personalized Roadmaps
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
            Track current vs target levels, check off milestones, and close priority gaps.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddSkill}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Skill Goal</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-8 text-center space-y-3">
          <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC]">
            No skill goals tracked yet
          </p>
          <p className="text-xs text-zinc-500 dark:text-[#94A3B8] max-w-md mx-auto">
            Add skills you know or want to learn to generate visual proficiency gaps and step-by-step learning checklists.
          </p>
          <button
            type="button"
            onClick={onAddSkill}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Your First Skill</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const gap = Math.max(0, goal.targetLevel - goal.currentLevel);
            const topics = goal.roadmapTopics || [];
            const completedTopics = topics.filter((t) => t.completed).length;
            const expanded = Boolean(expandedMap[goal._id]);

            return (
              <article
                key={goal._id}
                className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
                      <span>{goal.category || 'General'}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          goal.priority === 'high'
                            ? 'text-rose-700 dark:text-rose-300 font-medium'
                            : goal.priority === 'medium'
                            ? 'text-amber-700 dark:text-amber-300 font-medium'
                            : 'text-zinc-500 dark:text-[#94A3B8]'
                        }
                      >
                        {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} priority
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{goal.totalMinutesLogged || 0}m logged</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                      {goal.skillName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditSkill(goal)}
                      aria-label={`Edit ${goal.skillName}`}
                      className="p-1.5 text-zinc-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-[#818CF8] rounded-md hover:bg-zinc-100 dark:hover:bg-[#273449]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === goal._id}
                      onClick={() => handleDeleteGoal(goal)}
                      aria-label={`Remove ${goal.skillName}`}
                      className="p-1.5 text-zinc-500 dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/15 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Proficiency & Gap Metrics */}
                <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-zinc-100 dark:border-[#334155]">
                  <div>
                    <p className="text-zinc-500 dark:text-[#94A3B8]">Current</p>
                    <p className="font-medium text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                      L{goal.currentLevel} · {LEVEL_LABELS[goal.currentLevel]}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 dark:text-[#94A3B8]">Target</p>
                    <p className="font-medium text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
                      L{goal.targetLevel} · {LEVEL_LABELS[goal.targetLevel]}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 dark:text-[#94A3B8]">Skill Gap</p>
                    <p
                      className={`font-mono font-semibold tabular-nums mt-0.5 ${
                        gap >= 2
                          ? 'text-amber-700 dark:text-amber-300'
                          : gap === 1
                          ? 'text-indigo-700 dark:text-[#818CF8]'
                          : 'text-emerald-700 dark:text-[#2DD4BF]'
                      }`}
                    >
                      {gap > 0 ? `${gap} level${gap > 1 ? 's' : ''}` : 'On target'}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-[#94A3B8] tabular-nums">
                    <span>
                      Roadmap progress ({completedTopics}/{topics.length} topics)
                    </span>
                    <span className="font-mono font-semibold text-indigo-700 dark:text-[#818CF8]">
                      {goal.progressPercent || 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-[#111827] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        goal.progressPercent >= 100
                          ? 'bg-emerald-600 dark:bg-[#2DD4BF]'
                          : 'bg-indigo-600 dark:bg-[#818CF8]'
                      }`}
                      style={{ width: `${goal.progressPercent || 0}%` }}
                    />
                  </div>
                </div>

                {/* Roadmap Checklist */}
                {topics.length > 0 && (
                  <div className="divide-y divide-zinc-100 dark:divide-[#334155] border-t border-zinc-100 dark:border-[#334155]">
                    {topics.map((topic) => {
                      const isBusy = busyTopicKey === `${goal._id}:${topic.topicId}`;
                      return (
                        <button
                          key={topic.topicId}
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleTopic(goal, topic)}
                          className="w-full py-2.5 flex items-start gap-2.5 text-left hover:bg-zinc-50/70 dark:hover:bg-[#273449]/40 transition-colors disabled:opacity-60"
                        >
                          {topic.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#2DD4BF] shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-400 dark:text-slate-500 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-medium ${
                                topic.completed
                                  ? 'line-through text-zinc-400 dark:text-[#94A3B8]'
                                  : 'text-zinc-900 dark:text-[#F8FAFC]'
                              }`}
                            >
                              {topic.title}
                            </p>
                            {topic.description && (
                              <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] mt-0.5">
                                {topic.description}
                              </p>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-zinc-400 dark:text-[#94A3B8] shrink-0 tabular-nums">
                            {topic.estimatedMinutes || 30}m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Next Steps & Related Topics Toggle */}
                {(goal.recommendedNextSteps?.length > 0 || goal.relatedTopics?.length > 0) && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-[#334155]">
                    <button
                      type="button"
                      onClick={() => toggleExpand(goal._id)}
                      className="flex items-center justify-between w-full text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                    >
                      <span>Recommended next steps &amp; related topics</span>
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {expanded && (
                      <div className="mt-2.5 space-y-2 text-xs text-zinc-600 dark:text-[#94A3B8]">
                        {goal.recommendedNextSteps?.length > 0 && (
                          <ul className="list-disc pl-4 space-y-1">
                            {goal.recommendedNextSteps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        )}
                        {goal.relatedTopics?.length > 0 && (
                          <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8]">
                            Related topics: {goal.relatedTopics.join(' · ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
