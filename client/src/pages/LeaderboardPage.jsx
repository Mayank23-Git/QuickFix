import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { TableRowSkeleton } from '../components/Skeletons.jsx';
import { apiRequest } from '../services/api.js';

export function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState({ totalCompletedSessions: 0, totalOpenDoubts: 0, totalStudents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest('/api/leaderboard')
      .then((data) => {
        if (!active) return;
        setLeaderboard(data.leaderboard || []);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppLayout
      title="Campus Leaderboard"
      subtitle="Top student mentors ranked by verified contribution points and completed sessions"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-1">
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Total Completed Sessions</p>
            <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
              {stats.totalCompletedSessions}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-1">
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Open Doubts Waiting</p>
            <p className="font-mono text-2xl font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
              {stats.totalOpenDoubts}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-1">
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">How Points Are Earned</p>
            <p className="text-sm font-medium text-zinc-800 dark:text-slate-200 pt-1">
              +20 pts per completed session + optional doubt bounty
            </p>
          </div>
        </div>

        {loading ? (
          <TableRowSkeleton rows={6} />
        ) : leaderboard.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-10 text-center text-sm text-zinc-600 dark:text-[#94A3B8]">
            No contributors on the leaderboard yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-[#334155] text-xs font-medium text-zinc-500 dark:text-[#94A3B8] bg-zinc-50/70 dark:bg-[#111827]">
                    <th className="py-3 px-4 w-14">Rank</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4 hidden md:table-cell">Top Skills</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Badges</th>
                    <th className="py-3 px-4 text-right">Sessions</th>
                    <th className="py-3 px-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-[#334155] text-sm">
                  {leaderboard.map((entry) => (
                    <tr key={entry._id} className="hover:bg-zinc-50/60 dark:hover:bg-[#273449]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                        #{entry.rank}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link to={`/profile/${entry._id}`} className="flex items-center gap-3 group">
                          <Avatar src={entry.avatarUrl} name={entry.fullName} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-[#F8FAFC] group-hover:text-indigo-700 dark:group-hover:text-[#818CF8] truncate">
                              {entry.fullName}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-[#94A3B8] truncate">
                              {[entry.branch, entry.college].filter(Boolean).join(' · ') || 'Campus Student'}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell text-xs text-zinc-600 dark:text-[#94A3B8] max-w-xs truncate">
                        {entry.skills?.length > 0
                          ? entry.skills.map((s) => s.name).join(' · ')
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 hidden sm:table-cell text-xs text-zinc-600 dark:text-[#94A3B8]">
                        {entry.badges?.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-slate-200">
                            <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-[#818CF8]" />
                            <span>{entry.badges[0].name}</span>
                            {entry.badges.length > 1 && (
                              <span className="text-zinc-400 dark:text-slate-500">+{entry.badges.length - 1}</span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-700 dark:text-slate-200 tabular-nums">
                        {entry.completedSessions || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
                        {entry.contributionPoints || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
