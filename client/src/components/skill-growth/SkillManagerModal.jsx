import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const LEVEL_OPTIONS = [
  { value: 1, label: 'Level 1 · Beginner' },
  { value: 2, label: 'Level 2 · Foundations' },
  { value: 3, label: 'Level 3 · Intermediate' },
  { value: 4, label: 'Level 4 · Advanced' },
  { value: 5, label: 'Level 5 · Expert' },
];

export function SkillManagerModal({ isOpen, editingGoal, catalogSkills, onClose, onSaved }) {
  const toast = useToast();
  const isEditing = Boolean(editingGoal);

  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [category, setCategory] = useState('Programming');
  const [currentLevel, setCurrentLevel] = useState(2);
  const [targetLevel, setTargetLevel] = useState(4);
  const [priority, setPriority] = useState('medium');
  const [syncToProfileSkills, setSyncToProfileSkills] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingGoal) {
      setSelectedSkillId(editingGoal.skillId || '');
      setCustomSkillName(editingGoal.skillName || '');
      setCategory(editingGoal.category || 'General');
      setCurrentLevel(editingGoal.currentLevel || 2);
      setTargetLevel(editingGoal.targetLevel || 4);
      setPriority(editingGoal.priority || 'medium');
      setSyncToProfileSkills(editingGoal.syncToProfileSkills !== false);
    } else {
      setSelectedSkillId('');
      setCustomSkillName('');
      setCategory('Programming');
      setCurrentLevel(2);
      setTargetLevel(4);
      setPriority('high');
      setSyncToProfileSkills(true);
    }
  }, [isOpen, editingGoal]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const safeCurrent = Number(currentLevel);
    const safeTarget = Math.max(safeCurrent, Number(targetLevel));

    setSaving(true);
    try {
      if (isEditing) {
        const res = await apiRequest(`/api/skill-growth/skills/${editingGoal._id}`, {
          method: 'PATCH',
          body: {
            currentLevel: safeCurrent,
            targetLevel: safeTarget,
            priority,
            category,
            syncToProfileSkills,
          },
        });
        toast.success(res.message || 'Skill goal updated.');
        if (res.achievementUpdate?.newlyUnlockedBadges?.length > 0) {
          toast.success(
            `Unlocked badge: ${res.achievementUpdate.newlyUnlockedBadges.map((b) => b.name).join(', ')}`
          );
        }
      } else {
        const isCatalog = selectedSkillId && selectedSkillId !== '__custom__';
        if (!isCatalog && customSkillName.trim().length < 2) {
          toast.error('Select a catalog skill or enter a custom skill name (at least 2 characters).');
          setSaving(false);
          return;
        }
        const res = await apiRequest('/api/skill-growth/skills', {
          method: 'POST',
          body: {
            skillId: isCatalog ? selectedSkillId : '',
            skillName: isCatalog ? '' : customSkillName.trim(),
            category,
            currentLevel: safeCurrent,
            targetLevel: safeTarget,
            priority,
            syncToProfileSkills,
          },
        });
        toast.success(res.message || 'Skill added to analyzer.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save skill goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/50 dark:bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-manager-title"
    >
      <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-[#334155] flex items-center justify-between">
          <div>
            <h2 id="skill-manager-title" className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
              {isEditing ? `Edit ${editingGoal.skillName}` : 'Add Skill to Analyzer'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
              Set current and target proficiency levels to build your skill gap roadmap.
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
          {!isEditing && (
            <>
              <div>
                <label htmlFor="goal-catalog-skill" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                  Choose from QuickFix catalog or add custom
                </label>
                <select
                  id="goal-catalog-skill"
                  value={selectedSkillId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSkillId(val);
                    const found = (catalogSkills || []).find((s) => s._id === val);
                    if (found) setCategory(found.category || 'General');
                  }}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                >
                  <option value="">Select a skill...</option>
                  {(catalogSkills || []).map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                  <option value="__custom__">+ Custom skill (TypeScript, System Design, Docker...)</option>
                </select>
              </div>

              {(selectedSkillId === '__custom__' || selectedSkillId === '') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="goal-custom-name" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                      Custom skill name
                    </label>
                    <input
                      id="goal-custom-name"
                      type="text"
                      value={customSkillName}
                      onChange={(e) => {
                        setCustomSkillName(e.target.value);
                        if (!selectedSkillId) setSelectedSkillId('__custom__');
                      }}
                      placeholder="e.g. System Design"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="goal-category" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                      Category
                    </label>
                    <input
                      id="goal-category"
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Web & Systems"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-current-lvl" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                Current proficiency
              </label>
              <select
                id="goal-current-lvl"
                value={currentLevel}
                onChange={(e) => {
                  const nextCur = Number(e.target.value);
                  setCurrentLevel(nextCur);
                  if (Number(targetLevel) < nextCur) setTargetLevel(nextCur);
                }}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="goal-target-lvl" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
                Target proficiency
              </label>
              <select
                id="goal-target-lvl"
                value={targetLevel}
                onChange={(e) => setTargetLevel(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              >
                {LEVEL_OPTIONS.filter((o) => o.value >= Number(currentLevel)).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="goal-priority" className="block text-xs font-medium text-zinc-700 dark:text-slate-200 mb-1">
              Focus priority
            </label>
            <select
              id="goal-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={syncToProfileSkills}
              onChange={(e) => setSyncToProfileSkills(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 dark:border-[#334155] text-indigo-600 focus:ring-indigo-500"
            />
            <span>Sync current level to my QuickFix peer-matching profile (for catalog skills)</span>
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
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Skill & Generate Roadmap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
