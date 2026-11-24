import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { ThemeSelector } from '../components/ThemeSelector.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiRequest } from '../services/api.js';

const ACADEMIC_YEARS = ['', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'];
const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const PRESET_AVATARS = [
  '/src/assets/images/avatar_student_one_1795456563754.jpg',
  '/src/assets/images/avatar_student_two_1795456563811.jpg',
  '/src/assets/images/avatar_student_three_1795456563531.jpg',
  '/src/assets/images/avatar_student_four_1795456563895.jpg',
];

export function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    college: '',
    branch: '',
    academicYear: '',
    bio: '',
    avatarUrl: '',
    careerGoal: '',
    learningInterests: '',
  });
  const [catalogSkills, setCatalogSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selectedProficiency, setSelectedProficiency] = useState('Intermediate');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        college: user.college || '',
        branch: user.branch || '',
        academicYear: user.academicYear || '',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        careerGoal: user.careerGoal || '',
        learningInterests: (user.learningInterests || []).join(', '),
      });
      setMySkills(user.skills || []);
    }
  }, [user]);

  useEffect(() => {
    apiRequest('/api/skills')
      .then((d) => setCatalogSkills(d.skills || []))
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (form.fullName.trim().length < 2) {
      toast.error('Full name must be at least 2 characters.');
      return;
    }
    setSavingProfile(true);
    try {
      await apiRequest('/api/users/me', {
        method: 'PATCH',
        body: form,
      });
      await refreshUser();
      toast.success('Profile saved.');
      navigate(`/profile/${user._id}`);
    } catch (err) {
      toast.error(err.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddOrUpdateSkill = async (skillIdToSave, prof) => {
    if (!skillIdToSave) {
      toast.info('Select a skill from the catalog first.');
      return;
    }
    setSavingSkill(true);
    try {
      const data = await apiRequest('/api/users/me/skills', {
        method: 'POST',
        body: { skillId: skillIdToSave, proficiency: prof },
      });
      setMySkills(data.skills || []);
      setSelectedSkillId('');
      await refreshUser();
      toast.success('Skill list updated.');
    } catch (err) {
      toast.error(err.message || 'Could not save skill.');
    } finally {
      setSavingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillId) => {
    try {
      const data = await apiRequest(`/api/users/me/skills/${skillId}`, {
        method: 'DELETE',
      });
      setMySkills(data.skills || []);
      await refreshUser();
      toast.info('Skill removed.');
    } catch (err) {
      toast.error(err.message || 'Could not remove skill.');
    }
  };

  return (
    <AppLayout title="Edit Profile & Skills" subtitle="Update your academic info and manage your skill proficiency">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">Student Information</h2>

          <div className="flex flex-wrap items-center gap-4">
            <Avatar src={form.avatarUrl} name={form.fullName} size="lg" />
            <div className="space-y-2 flex-1 min-w-[200px]">
              <p className="text-xs font-medium text-zinc-700 dark:text-[#94A3B8]">Choose a campus portrait or enter an image URL</p>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, avatarUrl: url }))}
                    className={`rounded-full p-0.5 border-2 transition-colors ${
                      form.avatarUrl === url
                        ? 'border-indigo-600 dark:border-[#818CF8]'
                        : 'border-transparent hover:border-zinc-300 dark:hover:border-slate-500'
                    }`}
                    aria-label={`Select portrait preset ${idx + 1}`}
                  >
                    <Avatar src={url} name={`Preset ${idx + 1}`} size="sm" />
                  </button>
                ))}
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, avatarUrl: '' }))}
                    className="text-xs text-zinc-500 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC] px-2"
                  >
                    Use initials
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="edit-avatar-url" className="block text-xs font-medium text-zinc-700 dark:text-[#94A3B8] mb-1">
              Avatar URL (optional)
            </label>
            <input
              id="edit-avatar-url"
              type="text"
              value={form.avatarUrl}
              onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            />
          </div>

          <div>
            <label htmlFor="edit-fullname" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
              Full name
            </label>
            <input
              id="edit-fullname"
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-college" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                College / University
              </label>
              <input
                id="edit-college"
                type="text"
                value={form.college}
                onChange={(e) => setForm((p) => ({ ...p, college: e.target.value }))}
                placeholder="State University"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
            </div>

            <div>
              <label htmlFor="edit-year" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Academic Year
              </label>
              <select
                id="edit-year"
                value={form.academicYear}
                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y || 'blank'} value={y}>
                    {y || 'Select year'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-branch" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
              Branch / Department
            </label>
            <input
              id="edit-branch"
              type="text"
              value={form.branch}
              onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))}
              placeholder="Computer Science & Engineering"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            />
          </div>

          <div>
            <label htmlFor="edit-bio" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
              Short bio
            </label>
            <textarea
              id="edit-bio"
              rows={3}
              maxLength={400}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Mention courses you enjoy helping with or areas you are currently studying..."
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-career-goal" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Career goal (optional)
              </label>
              <input
                id="edit-career-goal"
                type="text"
                maxLength={160}
                value={form.careerGoal}
                onChange={(e) => setForm((p) => ({ ...p, careerGoal: e.target.value }))}
                placeholder="e.g. Full-Stack SDE, ML Engineer"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
            </div>

            <div>
              <label htmlFor="edit-learning-interests" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Learning interests
              </label>
              <input
                id="edit-learning-interests"
                type="text"
                value={form.learningInterests}
                onChange={(e) => setForm((p) => ({ ...p, learningInterests: e.target.value }))}
                placeholder="DSA, React, System Design"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-zinc-100 dark:border-[#334155]">
            <button
              type="button"
              onClick={() => navigate(`/profile/${user._id}`)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Right Column: Appearance & Skill Manager */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Appearance &amp; Theme
              </h2>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8] mt-0.5">
                Choose Light Mode, Dark Mode, or sync automatically with your system preference.
              </p>
            </div>
            <ThemeSelector variant="segmented" />
          </section>

          <section className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">Manage Your Skills</h2>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8] mt-0.5">
                Skills and proficiency levels power doubt matching across QuickFix.
              </p>
            </div>

            <div className="space-y-3 bg-zinc-50 dark:bg-[#111827] border border-zinc-200 dark:border-[#334155] rounded-xl p-4">
              <div>
                <label htmlFor="add-skill-select" className="block text-xs font-medium text-zinc-700 dark:text-[#94A3B8] mb-1">
                  Skill from catalog
                </label>
                <select
                  id="add-skill-select"
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1E293B] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                >
                  <option value="">Choose a skill...</option>
                  {catalogSkills.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="add-skill-prof" className="block text-xs font-medium text-zinc-700 dark:text-[#94A3B8] mb-1">
                    Proficiency
                  </label>
                  <select
                    id="add-skill-prof"
                    value={selectedProficiency}
                    onChange={(e) => setSelectedProficiency(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1E293B] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                  >
                    {PROFICIENCY_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={savingSkill}
                  onClick={() => handleAddOrUpdateSkill(selectedSkillId, selectedProficiency)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Skill</span>
                </button>
              </div>
            </div>

            {mySkills.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-[#94A3B8]">You have not added any skills yet.</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                {mySkills.map((skill) => (
                  <div key={skill.skillId} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC] truncate">{skill.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">{skill.category}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        aria-label={`Proficiency for ${skill.name}`}
                        value={skill.proficiency}
                        onChange={(e) => handleAddOrUpdateSkill(skill.skillId, e.target.value)}
                        className="px-2.5 py-1 text-xs bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                      >
                        {PROFICIENCY_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill.skillId)}
                        aria-label={`Remove ${skill.name}`}
                        className="p-1.5 text-zinc-400 dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
