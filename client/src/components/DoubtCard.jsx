import { Link } from 'react-router-dom';
import { ArrowRight, Award } from 'lucide-react';
import { Avatar } from './Avatar.jsx';
import { formatRelativeTime } from '../utils/time.js';
import { formatStatusLabel, getStatusLabelStyle, getUrgencyLabelStyle } from '../utils/badges.js';

export function DoubtCard({ doubt }) {
  const author = doubt.authorId || {};
  const skill = doubt.skillId || {};

  return (
    <article className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 hover:border-zinc-300 dark:hover:border-slate-500 transition-colors duration-150 flex flex-col justify-between gap-4">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-[#94A3B8]">
          <span className="font-medium text-zinc-800 dark:text-[#F8FAFC]">{skill.name || 'General'}</span>
          <span aria-hidden="true">·</span>
          <span className={getUrgencyLabelStyle(doubt.urgency)}>{doubt.urgency} urgency</span>
          <span aria-hidden="true">·</span>
          <span className={getStatusLabelStyle(doubt.status)}>{formatStatusLabel(doubt.status)}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatRelativeTime(doubt.createdAt)}</span>
          {doubt.bountyPoints > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-[#818CF8] font-medium tabular-nums">
                <Award className="w-3.5 h-3.5" />
                +{doubt.bountyPoints} bounty pts
              </span>
            </>
          )}
        </div>

        <Link
          to={`/doubts/${doubt._id}`}
          className="block text-base font-semibold text-zinc-900 dark:text-[#F8FAFC] hover:text-indigo-700 dark:hover:text-[#818CF8] transition-colors leading-snug"
        >
          {doubt.title}
        </Link>

        <p className="text-sm text-zinc-600 dark:text-[#94A3B8] line-clamp-2 leading-relaxed">
          {doubt.description}
        </p>
      </div>

      <div className="pt-3 border-t border-zinc-100 dark:border-[#334155] flex items-center justify-between gap-3">
        <Link
          to={author._id ? `/profile/${author._id}` : '#'}
          className="flex items-center gap-2.5 min-w-0 group"
        >
          <Avatar src={author.avatarUrl} name={author.fullName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-800 dark:text-[#F8FAFC] group-hover:text-indigo-700 dark:group-hover:text-[#818CF8] truncate">
              {author.fullName || 'Student'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8] truncate">
              {[author.branch, author.college].filter(Boolean).join(' · ') || 'Campus Member'}
            </p>
          </div>
        </Link>

        <Link
          to={`/doubts/${doubt._id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC] whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-[#818CF8]/15 transition-colors"
        >
          <span>
            {['Open', 'Pending Acceptance'].includes(doubt.status) ? 'Inspect & Help' : 'View Details'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}
