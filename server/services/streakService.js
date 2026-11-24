import { LearningActivity } from '../models/LearningActivity.js';
import { User } from '../models/User.js';

export function normalizeTimezone(rawTz) {
  const candidate = typeof rawTz === 'string' ? rawTz.trim() : '';
  if (!candidate) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return 'UTC';
  }
}

export function getDayKey(date = new Date(), timezone = 'UTC') {
  const tz = normalizeTimezone(timezone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function shiftDayKey(dayKey, deltaDays) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function diffDayKeys(earlierDayKey, laterDayKey) {
  const [y1, m1, d1] = earlierDayKey.split('-').map(Number);
  const [y2, m2, d2] = laterDayKey.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
}

function getMotivationalMessage(currentStreak, loggedToday, totalActiveDays) {
  if (totalActiveDays === 0) {
    return 'Log your first completed study session or roadmap topic to start a verified streak.';
  }
  if (currentStreak === 0) {
    return 'Yesterday is behind you—complete one focused session today to kick off a fresh streak.';
  }
  if (currentStreak >= 30) {
    return `${currentStreak} straight days of deliberate practice—you are operating at elite campus consistency.`;
  }
  if (currentStreak >= 7) {
    return loggedToday
      ? `${currentStreak}-day streak locked in for today. Keep compounding your mastery.`
      : `${currentStreak}-day streak active—complete one session today to keep it alive.`;
  }
  if (loggedToday) {
    return `Day ${currentStreak} completed today. Show up again tomorrow to build lasting momentum.`;
  }
  return `You have a ${currentStreak}-day streak on the line—log a quick session today to extend it.`;
}

function computeIntensity(minutes, count) {
  if (!count || count <= 0) return 0;
  if (minutes >= 90 || count >= 3) return 4;
  if (minutes >= 50 || count >= 2) return 3;
  if (minutes >= 25) return 2;
  return 1;
}

export async function getUserStreakSummary(userId, preferredTimezone = '') {
  const user = await User.findById(userId).select('timezone').lean();
  const timezone = normalizeTimezone(preferredTimezone || user?.timezone || 'UTC');
  const todayKey = getDayKey(new Date(), timezone);
  const yesterdayKey = shiftDayKey(todayKey, -1);

  const activities = await LearningActivity.find({ userId, completed: true })
    .select('dayKey durationMinutes')
    .sort({ dayKey: 1 })
    .lean();

  const dayMap = new Map();
  let totalMinutes = 0;

  for (const act of activities) {
    if (!act.dayKey) continue;
    totalMinutes += act.durationMinutes || 0;
    const prev = dayMap.get(act.dayKey) || { count: 0, minutes: 0 };
    dayMap.set(act.dayKey, {
      count: prev.count + 1,
      minutes: prev.minutes + (act.durationMinutes || 0),
    });
  }

  const sortedDayKeys = Array.from(dayMap.keys()).sort();
  const totalLearningDays = sortedDayKeys.length;
  const lastLearningDayKey = totalLearningDays > 0 ? sortedDayKeys[sortedDayKeys.length - 1] : '';

  let longestStreak = 0;
  let running = 0;
  for (let i = 0; i < sortedDayKeys.length; i += 1) {
    if (i === 0) {
      running = 1;
    } else {
      const diff = diffDayKeys(sortedDayKeys[i - 1], sortedDayKeys[i]);
      running = diff === 1 ? running + 1 : 1;
    }
    if (running > longestStreak) longestStreak = running;
  }

  let currentStreak = 0;
  if (lastLearningDayKey === todayKey || lastLearningDayKey === yesterdayKey) {
    let cursor = lastLearningDayKey;
    while (dayMap.has(cursor)) {
      currentStreak += 1;
      cursor = shiftDayKey(cursor, -1);
    }
  }

  const loggedToday = dayMap.has(todayKey);

  // Sync calculated streak metrics onto the User document
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        timezone,
        currentStreak,
        longestStreak,
        totalLearningDays,
        lastLearningDayKey,
      },
    }
  ).catch(() => {});

  // Build 12-week (84 days) contribution calendar ending on todayKey
  const totalCalendarDays = 84;
  const startDayKey = shiftDayKey(todayKey, -(totalCalendarDays - 1));
  const calendarDays = [];

  for (let i = 0; i < totalCalendarDays; i += 1) {
    const dk = shiftDayKey(startDayKey, i);
    const stats = dayMap.get(dk) || { count: 0, minutes: 0 };
    const [yy, mm, dd] = dk.split('-').map(Number);
    const utcDay = new Date(Date.UTC(yy, mm - 1, dd));
    calendarDays.push({
      dayKey: dk,
      weekday: utcDay.getUTCDay(), // 0 Sun .. 6 Sat
      count: stats.count,
      minutes: stats.minutes,
      intensity: computeIntensity(stats.minutes, stats.count),
      isToday: dk === todayKey,
      label: utcDay.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
    });
  }

  return {
    timezone,
    todayKey,
    loggedToday,
    currentStreak,
    longestStreak,
    totalLearningDays,
    totalMinutes,
    totalActivities: activities.length,
    lastLearningDayKey,
    motivationalMessage: getMotivationalMessage(currentStreak, loggedToday, totalLearningDays),
    calendarDays,
  };
}
