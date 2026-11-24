import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const DURATION_PRESETS = [15, 30, 45, 60];

export function LogActivityModal({ isOpen, onClose, goals, catalogSkills, onLogged }) {
  const toast = useToast();
  const [skillGoalId, setSkillGoalId] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [topic, setTopic] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [completed, setCompleted] = useState(true);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSkillGoalId(goals?.[0]?._id || '');
      setCustomSkillName('');
      setTopic('');
      setDurationMinutes(30);
      setCompleted(true);
      setNote('');
      setIdempotencyKey(
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      );
    }
  }, [isOpen, goals]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const chosenGoal = goals.find((g) => g._id === skillGoalId);
    const skillName = chosenGoal ? chosenGoal.skillName : customSkillName.trim();

    if (!skillName) {
      toast.error('Please select a tracked skill or enter a skill name.');
      return;
    }
    if (topic.trim().length < 2) {
      toast.error('Enter the topic you studied (at least 2 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const data = await apiRequest('/api/skill-growth/activities', {
        method: 'POST',
        body: {
          skillGoalId: chosenGoal?._id || '',
          skillName,
          topic: topic.trim(),
          durationMinutes: Number(durationMinutes) || 30,
          completed,
          note: note.trim(),
          timezone: tz,
          idempotencyKey,
        },
      });
      toast.success(data.message || 'Learning activity logged.');
      if (data.achievementUpdate?.newlyUnlockedBadges?.length > 0) {
        const names = data.achievementUpdate.newlyUnlockedBadges.map((b) => b.name).join(', ');
        toast.success(`Unlocked milestone badge: ${names}`);
      }
      onLogged?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not log learning activity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/50 dark:bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-activity-title"
    >
      <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-[#334155] flex items-center justify-between">
          <div>
            <h2 id="log-activity-title" className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
              Log Learning Activity
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
              Updates your skill progress, analytics charts, and daily learning streak.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-zinc-500 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="log-skill-select" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
              Skill
            </label>
            <select
              id="log-skill-select"
              value={skillGoalId}
              onChange={(e) => setSkillGoalId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            >
              {goals.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.skillName} (Level {g.currentLevel} → {g.targetLevel})
                </option>
              ))}
              <option value="__custom__">Other skill...</option>
            </select>
          </div>

          {(!skillGoalId || skillGoalId === '__custom__') && (
            <div>
              <label htmlFor="log-custom-skill" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                Skill name
              </label>
              <input
                id="log-custom-skill"
                list="quickfix-skill-suggestions"
                type="text"
                value={customSkillName}
                onChange={(e) => setCustomSkillName(e.target.value)}
                placeholder="e.g. DSA, React, SQL, System Design"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
              <datalist id="quickfix-skill-suggestions">
                {(catalogSkills || []).map((s) => (
                  <option key={s._id} value={s.name} />
                ))}
              </datalist>
            </div>
          )}

          <div>
            <label htmlFor="log-topic" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
              Topic studied
            </label>
            <input
              id="log-topic"
              type="text"
              required
              minLength={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Sliding window variable length problems & complexity trace"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            />
          </div>

          <div>
            <label htmlFor="log-duration" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
              Duration (minutes)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="log-duration"
                type="number"
                min={1}
                max={600}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-24 px-3 py-2 text-sm font-mono bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8] tabular-nums"
              />
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                    Number(durationMinutes) === mins
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-[#818CF8]/15 dark:text-[#818CF8] dark:border-[#818CF8]/40'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-[#111827] dark:text-[#94A3B8] dark:border-[#334155]'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="log-note" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
              Reflection note (optional)
            </label>
            <textarea
              id="log-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Key takeaway, bug resolved, or follow-up question..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 dark:border-[#334155] text-indigo-600 focus:ring-indigo-500"
            />
            <span>Mark as completed study session (counts toward today&apos;s streak)</span>
          </label>

          <div className="pt-3 border-t border-zinc-100 dark:border-[#334155] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
