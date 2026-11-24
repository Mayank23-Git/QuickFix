import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Avatar } from './Avatar.jsx';

export function HelperMatchCard({ match }) {
  const { user, relevantSkills = [], matchScore, matchExplanation } = match;

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/profile/${user._id}`} className="flex items-center gap-3 min-w-0 group">
          <Avatar src={user.avatarUrl} name={user.fullName} size="md" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC] group-hover:text-indigo-700 dark:group-hover:text-[#818CF8] truncate">
              {user.fullName}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8] truncate">
              {[user.branch, user.academicYear].filter(Boolean).join(' · ') || user.college || 'Student Mentor'}
            </p>
          </div>
        </Link>

        {matchScore !== null && matchScore !== undefined && (
          <div className="text-right shrink-0">
            <span className="font-mono text-sm font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
              {matchScore}% match
            </span>
          </div>
        )}
      </div>

      {matchExplanation && (
        <p className="text-xs text-zinc-600 dark:text-[#94A3B8] leading-relaxed">{matchExplanation}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-[#334155] text-xs text-zinc-500 dark:text-[#94A3B8]">
        <div className="truncate">
          {relevantSkills.length > 0
            ? relevantSkills.map((s) => `${s.name} (${s.proficiency})`).join(' · ')
            : 'Active Campus Helper'}
        </div>

        <Link
          to={`/profile/${user._id}`}
          className="inline-flex items-center gap-1 text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC] font-medium whitespace-nowrap shrink-0"
        >
          <span>Profile</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
