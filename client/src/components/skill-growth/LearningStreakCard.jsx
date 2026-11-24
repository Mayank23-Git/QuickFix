import { useMemo, useState } from 'react';
import { CalendarDays, Flame, Trophy } from 'lucide-react';

const INTENSITY_CLASSES = [
  'bg-zinc-100 dark:bg-[#111827] border-zinc-200 dark:border-[#334155]',
  'bg-emerald-200 dark:bg-[#2DD4BF]/25 border-emerald-300 dark:border-[#2DD4BF]/40',
  'bg-emerald-400 dark:bg-[#2DD4BF]/50 border-emerald-500 dark:border-[#2DD4BF]/60',
  'bg-emerald-500 dark:bg-[#2DD4BF]/75 border-emerald-600 dark:border-[#2DD4BF]/85',
  'bg-emerald-600 dark:bg-[#2DD4BF] border-emerald-700 dark:border-[#2DD4BF]',
];

export function LearningStreakCard({ streak, onOpenLogActivity }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const weeks = useMemo(() => {
    const days = streak?.calendarDays || [];
    if (days.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < days.length; i += 7) {
      chunks.push(days.slice(i, i + 7));
    }
    return chunks;
  }, [streak]);

  const activeDay = hoveredDay || (streak?.calendarDays || []).slice(-1)[0] || null;

  return (
    <section
      aria-label="Learning streak tracker"
      className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-[#F8FAFC]">
              Learning Streak &amp; Activity Calendar
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-[#94A3B8]">
            {streak?.motivationalMessage || 'Log completed learning sessions daily to build momentum.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLogActivity}
          className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Log Activity
        </button>
      </div>

      {/* Streak KPI Strip */}
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-zinc-100 dark:border-[#334155]">
        <div>
          <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Current Streak</p>
          <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
            {streak?.currentStreak || 0}{' '}
            <span className="text-xs font-sans font-normal text-zinc-500 dark:text-[#94A3B8]">days</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-[#94A3B8] inline-flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-indigo-600 dark:text-[#818CF8]" aria-hidden="true" />
            <span>Longest Streak</span>
          </p>
          <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
            {streak?.longestStreak || 0}{' '}
            <span className="text-xs font-sans font-normal text-zinc-500 dark:text-[#94A3B8]">days</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-[#94A3B8] inline-flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-[#2DD4BF]" aria-hidden="true" />
            <span>Active Days</span>
          </p>
          <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums mt-0.5">
            {streak?.totalLearningDays || 0}
          </p>
        </div>
      </div>

      {/* GitHub-style 12-week contribution calendar */}
      <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-[#334155]">
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
          <span>Last 12 weeks ({streak?.timezone || 'UTC'})</span>
          {activeDay && (
            <span className="font-mono tabular-nums text-zinc-700 dark:text-slate-200">
              {activeDay.label} ({activeDay.dayKey}): {activeDay.count} session{activeDay.count === 1 ? '' : 's'} ·{' '}
              {activeDay.minutes}m
            </span>
          )}
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-flex gap-1.5 min-w-full sm:min-w-0">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day) => (
                  <button
                    key={day.dayKey}
                    type="button"
                    onMouseEnter={() => setHoveredDay(day)}
                    onFocus={() => setHoveredDay(day)}
                    title={`${day.dayKey}: ${day.minutes} min (${day.count} activities)`}
                    aria-label={`${day.label}: ${day.count} activities, ${day.minutes} minutes`}
                    className={`w-4 h-4 rounded-[3px] border transition-transform hover:scale-110 focus:outline-none ${
                      INTENSITY_CLASSES[day.intensity] || INTENSITY_CLASSES[0]
                    } ${day.isToday ? 'ring-2 ring-indigo-600 dark:ring-[#818CF8] ring-offset-1 dark:ring-offset-[#1E293B]' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-[#94A3B8]">
          <span>Same-day logs combine into 1 active day</span>
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            {INTENSITY_CLASSES.map((cls, i) => (
              <span key={i} className={`w-3 h-3 rounded-[2px] border inline-block ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </section>
  );
}
