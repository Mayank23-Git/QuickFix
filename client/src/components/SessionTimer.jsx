import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatClock, getSessionTimerMetrics } from '../utils/time.js';

export function SessionTimer({ startedAt, durationMinutes = 15, status }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (status === 'Completed' || !startedAt) return undefined;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  const { started, elapsedSeconds, remainingSeconds, isOvertime } = getSessionTimerMetrics(
    startedAt,
    durationMinutes,
    nowMs
  );

  if (status === 'Completed') {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-[#94A3B8]">
        <Clock className="w-4 h-4 text-zinc-500 dark:text-[#94A3B8]" />
        <span>Session completed</span>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-slate-200">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="font-mono tabular-nums font-medium">15:00</span>
        <span className="text-xs text-zinc-500 dark:text-[#94A3B8]">Starts when a participant joins the call</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Clock className={`w-4 h-4 ${isOvertime ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-[#818CF8]'}`} />
        <span
          className={`font-mono text-base font-semibold tabular-nums ${
            isOvertime ? 'text-amber-700 dark:text-amber-300' : 'text-zinc-900 dark:text-[#F8FAFC]'
          }`}
        >
          {isOvertime ? `+${formatClock(elapsedSeconds - durationMinutes * 60)}` : formatClock(remainingSeconds)}
        </span>
      </div>
      <span className="text-xs text-zinc-500 dark:text-[#94A3B8] tabular-nums">
        {isOvertime
          ? `15m window elapsed (Total ${formatClock(elapsedSeconds)})`
          : `remaining · Elapsed ${formatClock(elapsedSeconds)}`}
      </span>
    </div>
  );
}
