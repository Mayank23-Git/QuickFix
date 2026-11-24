import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpRight } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { CardSkeleton } from '../components/Skeletons.jsx';
import { apiRequest } from '../services/api.js';

export function FindPeersPage() {
  const [students, setStudents] = useState([]);
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [skillId, setSkillId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/skills')
      .then((d) => setSkills(d.skills || []))
      .catch(() => {});
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (skillId) params.set('skillId', skillId);
      const data = await apiRequest(`/api/users?${params.toString()}`);
      setStudents(data.students || []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [search, skillId]);

  useEffect(() => {
    const t = setTimeout(fetchStudents, 180);
    return () => clearTimeout(t);
  }, [fetchStudents]);

  return (
    <AppLayout
      title="Find Skilled Peers"
      subtitle="Browse student profiles by skill, branch, and completed mentoring sessions"
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-zinc-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, college, branch, or bio..."
              aria-label="Search students"
              className="w-full pl-10 pr-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] placeholder:text-zinc-400 dark:placeholder:text-[#94A3B8] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            />
          </div>
          <div className="md:col-span-5">
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              aria-label="Filter peers by skill"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#111827] text-zinc-900 dark:text-[#F8FAFC] border border-zinc-300 dark:border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#818CF8]"
            >
              <option value="">All Skills</option>
              {skills.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <CardSkeleton count={4} />
        ) : students.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-10 text-center text-sm text-zinc-600 dark:text-[#94A3B8]">
            No students found matching those criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((student) => (
              <div
                key={student._id}
                className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/profile/${student._id}`} className="flex items-center gap-3 min-w-0 group">
                      <Avatar src={student.avatarUrl} name={student.fullName} size="md" />
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-[#F8FAFC] group-hover:text-indigo-700 dark:group-hover:text-[#818CF8] truncate">
                          {student.fullName}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#94A3B8] truncate">
                          {[student.branch, student.academicYear, student.college].filter(Boolean).join(' · ') || 'Campus Student'}
                        </p>
                      </div>
                    </Link>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                        {student.contributionPoints || 0} pts
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                        {student.completedSessions || 0} sessions
                      </p>
                    </div>
                  </div>

                  {student.bio && (
                    <p className="text-sm text-zinc-600 dark:text-[#94A3B8] line-clamp-2 leading-relaxed">{student.bio}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-[#334155] flex items-center justify-between gap-3 text-xs text-zinc-600 dark:text-[#94A3B8]">
                  <div className="truncate">
                    {student.skills?.length > 0
                      ? student.skills.slice(0, 4).map((s) => `${s.name} (${s.proficiency})`).join(' · ')
                      : 'No skills listed yet'}
                  </div>

                  <Link
                    to={`/profile/${student._id}`}
                    className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC] whitespace-nowrap shrink-0"
                  >
                    <span>View Profile</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
