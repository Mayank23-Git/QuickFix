import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { apiRequest } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export function PostDoubtPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    skillId: '',
    urgency: 'Medium',
    bountyPoints: 0,
  });
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const skillRes = await apiRequest('/api/skills');
        setSkills(skillRes.skills || []);

        if (isEditMode) {
          const reqRes = await apiRequest(`/api/requests/${id}`);
          const r = reqRes.request;
          setForm({
            title: r.title || '',
            description: r.description || '',
            skillId: r.skillId?._id || r.skillId || '',
            urgency: r.urgency || 'Medium',
            bountyPoints: r.bountyPoints || 0,
          });
        }
      } catch (err) {
        setError(err.message || 'Unable to load form data.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, isEditMode]);

  const handleAutoCategorize = async () => {
    if (!form.title.trim() && !form.description.trim()) {
      toast.info('Write a title or description first so keywords can be matched.');
      return;
    }
    setSuggesting(true);
    try {
      const data = await apiRequest('/api/skills/suggest', {
        method: 'POST',
        body: { title: form.title, description: form.description },
      });
      if (data?.suggestion?.skillId) {
        setForm((prev) => ({ ...prev, skillId: data.suggestion.skillId }));
        toast.success(`Matched skill by keywords: ${data.suggestion.name}`);
      } else {
        toast.info('No exact keyword match found. Please select a skill manually.');
      }
    } catch {
      toast.error('Could not run keyword skill suggestion.');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.title.trim().length < 6) {
      setError('Title must be at least 6 characters.');
      return;
    }
    if (form.description.trim().length < 15) {
      setError('Please describe your doubt in at least 15 characters.');
      return;
    }
    if (!form.skillId) {
      setError('Please select a skill or category.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await apiRequest(`/api/requests/${id}`, {
          method: 'PATCH',
          body: {
            ...form,
            bountyPoints: Number(form.bountyPoints) || 0,
          },
        });
        toast.success('Doubt updated.');
        navigate(`/doubts/${id}`);
      } else {
        const data = await apiRequest('/api/requests', {
          method: 'POST',
          body: {
            ...form,
            bountyPoints: Number(form.bountyPoints) || 0,
          },
        });
        toast.success('Doubt posted to the campus board!');
        navigate(`/doubts/${data.request._id}`);
      }
    } catch (err) {
      setError(err.message || 'Unable to save doubt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title={isEditMode ? 'Edit Doubt' : 'Post a Doubt'}
      subtitle="Share what you are stuck on to get matched with a peer for a 15-minute video walkthrough"
    >
      <div className="max-w-2xl">
        {loading ? (
          <div className="h-80 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse" />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 sm:p-8 space-y-5"
          >
            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-500/15 px-3.5 py-2.5 text-sm text-rose-800 dark:text-rose-200">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="doubt-title" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Doubt title
              </label>
              <input
                id="doubt-title"
                type="text"
                required
                maxLength={140}
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. C++ pointer arithmetic segfault when resizing dynamic array"
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-[#94A3B8]">Be specific about the language, error, or concept.</p>
            </div>

            <div>
              <label htmlFor="doubt-description" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Detailed description
              </label>
              <textarea
                id="doubt-description"
                required
                rows={6}
                maxLength={3000}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Explain what you already tried, the error message or unexpected output, and what you want to clarify in 15 minutes..."
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="doubt-skill" className="block text-sm font-medium text-zinc-800 dark:text-slate-200">
                    Primary skill / subject
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCategorize}
                    disabled={suggesting}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC]"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>{suggesting ? 'Matching...' : 'Match from text'}</span>
                  </button>
                </div>
                <select
                  id="doubt-skill"
                  required
                  value={form.skillId}
                  onChange={(e) => setForm((p) => ({ ...p, skillId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                >
                  <option value="">Select a skill...</option>
                  {skills.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="doubt-urgency" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                  Urgency
                </label>
                <select
                  id="doubt-urgency"
                  value={form.urgency}
                  onChange={(e) => setForm((p) => ({ ...p, urgency: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
                >
                  <option value="Low">Low — Whenever a peer is free</option>
                  <option value="Medium">Medium — Today or tomorrow</option>
                  <option value="High">High — Assignment / exam deadline soon</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="doubt-bounty" className="block text-sm font-medium text-zinc-800 dark:text-slate-200 mb-1">
                Optional bonus bounty points (0 – 100)
              </label>
              <input
                id="doubt-bounty"
                type="number"
                min={0}
                max={100}
                step={5}
                value={form.bountyPoints}
                onChange={(e) => setForm((p) => ({ ...p, bountyPoints: e.target.value }))}
                className="w-40 px-3.5 py-2 text-sm font-mono tabular-nums bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-[#94A3B8]">
                Helpers earn +20 base points upon session completion plus any optional bounty reward you attach.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-[#334155]">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60 transition-colors"
              >
                {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Publish Doubt'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
