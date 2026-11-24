import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, RotateCcw } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { DoubtCard } from '../components/DoubtCard.jsx';
import { CardSkeleton } from '../components/Skeletons.jsx';
import { apiRequest } from '../services/api.js';

const STATUS_OPTIONS = [
  'All',
  'Open',
  'Accepted',
  'Ready to Join',
  'In Progress',
  'Resolved',
  'Cancelled',
];
const URGENCY_OPTIONS = ['All', 'High', 'Medium', 'Low'];

export function DoubtBoardPage() {
  const [doubts, setDoubts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [skillId, setSkillId] = useState('');
  const [status, setStatus] = useState('All');
  const [urgency, setUrgency] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/skills')
      .then((d) => setSkills(d.skills || []))
      .catch(() => {});
  }, []);

  const fetchDoubts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (skillId) params.set('skillId', skillId);
      if (status !== 'All') params.set('status', status);
      if (urgency !== 'All') params.set('urgency', urgency);

      const data = await apiRequest(`/api/requests?${params.toString()}`);
      setDoubts(data.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load doubt board.');
    } finally {
      setLoading(false);
    }
  }, [search, skillId, status, urgency]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoubts();
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchDoubts]);

  const resetFilters = () => {
    setSearch('');
    setSkillId('');
    setStatus('All');
    setUrgency('All');
  };

  return (
    <AppLayout
      title="Campus Doubt Board"
      subtitle="Search live doubts, filter by skill or urgency, and claim a 15-minute mentoring request"
    >
      <div className="space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-zinc-400 dark:text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doubts by keyword (e.g. pointer, SQL join, induction)..."
                aria-label="Search doubts"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              />
            </div>

            <div className="md:col-span-4">
              <select
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                aria-label="Filter by skill"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
              >
                <option value="">All Skills</option>
                {skills.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 bg-zinc-50 dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#111827] border border-transparent dark:border-[#334155] rounded-lg" role="group" aria-label="Filter by status">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatus(opt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    status === opt
                      ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                      : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-[#111827] border border-transparent dark:border-[#334155] rounded-lg" role="group" aria-label="Filter by urgency">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setUrgency(opt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    urgency === opt
                      ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                      : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  {opt === 'All' ? 'Any Urgency' : opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : error ? (
          <div className="bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-500/35 rounded-xl p-6 text-center space-y-3">
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            <button
              type="button"
              onClick={fetchDoubts}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg"
            >
              Try Again
            </button>
          </div>
        ) : doubts.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-10 text-center space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                No doubts match these filters
              </h2>
              <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
                Try clearing your filters or post a new question for campus helpers.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700"
              >
                Clear Filters
              </button>
              <Link
                to="/doubts/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post a Doubt</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8] tabular-nums">
              Showing {doubts.length} {doubts.length === 1 ? 'doubt' : 'doubts'} · Sorted newest first
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doubts.map((doubt) => (
                <DoubtCard key={doubt._id} doubt={doubt} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
