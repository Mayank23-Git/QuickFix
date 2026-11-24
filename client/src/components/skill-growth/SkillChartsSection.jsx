import { useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar, Line, Bar } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext.jsx';

ChartJS.register(
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

export function SkillChartsSection({ charts, range, onRangeChange, loadingRange }) {
  const { isDark } = useTheme();

  const palette = useMemo(
    () => ({
      text: isDark ? '#94A3B8' : '#52525B',
      heading: isDark ? '#F8FAFC' : '#18181B',
      grid: isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(228, 228, 231, 0.9)',
      tooltipBg: isDark ? '#1E293B' : '#FFFFFF',
      tooltipBorder: isDark ? '#334155' : '#E4E4E7',
      indigo: isDark ? '#818CF8' : '#4F46E5',
      indigoFill: isDark ? 'rgba(129, 140, 248, 0.22)' : 'rgba(79, 70, 229, 0.16)',
      teal: isDark ? '#2DD4BF' : '#0D9488',
      tealFill: isDark ? 'rgba(45, 212, 191, 0.18)' : 'rgba(13, 148, 136, 0.14)',
      amber: isDark ? '#FBBF24' : '#D97706',
    }),
    [isDark]
  );

  const radarItems = (charts?.radarAndGap || []).slice(0, 8);
  const gapItems = (charts?.radarAndGap || []).slice(0, 8);
  const activityItems = charts?.activityBySkill || [];
  const growthSeries = charts?.growthSeries || [];

  const radarData = {
    labels: radarItems.map((i) => i.skillName),
    datasets: [
      {
        label: 'Current Level',
        data: radarItems.map((i) => i.currentLevel),
        backgroundColor: palette.indigoFill,
        borderColor: palette.indigo,
        pointBackgroundColor: palette.indigo,
        borderWidth: 2,
      },
      {
        label: 'Target Level',
        data: radarItems.map((i) => i.targetLevel),
        backgroundColor: palette.tealFill,
        borderColor: palette.teal,
        pointBackgroundColor: palette.teal,
        borderWidth: 2,
        borderDash: [4, 4],
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: {
          stepSize: 1,
          color: palette.text,
          backdropColor: 'transparent',
          font: { size: 11 },
        },
        grid: { color: palette.grid },
        angleLines: { color: palette.grid },
        pointLabels: {
          color: palette.heading,
          font: { size: 11, weight: '500' },
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: palette.text, boxWidth: 12, padding: 14, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        titleColor: palette.heading,
        bodyColor: palette.text,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
      },
    },
  };

  const growthData = {
    labels: growthSeries.map((p) => p.label),
    datasets: [
      {
        label: 'Avg Skill Score (%)',
        data: growthSeries.map((p) => p.avgSkillScore),
        borderColor: palette.indigo,
        backgroundColor: palette.indigoFill,
        fill: true,
        tension: 0.3,
        spanGaps: true,
        pointRadius: 3,
      },
      {
        label: 'Study Minutes',
        data: growthSeries.map((p) => p.minutesLogged),
        borderColor: palette.teal,
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.25,
        pointRadius: 2.5,
        yAxisID: 'y1',
      },
    ],
  };

  const growthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: palette.text, maxTicksLimit: 8, font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: palette.grid },
        ticks: { color: palette.text, font: { size: 11 }, callback: (v) => `${v}%` },
      },
      y1: {
        position: 'right',
        min: 0,
        grid: { display: false },
        ticks: { color: palette.teal, font: { size: 11 }, callback: (v) => `${v}m` },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: palette.text, boxWidth: 12, padding: 14, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        titleColor: palette.heading,
        bodyColor: palette.text,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
      },
    },
  };

  const activityBarData = {
    labels: activityItems.map((i) => i.skillName),
    datasets: [
      {
        label: 'Minutes Studied',
        data: activityItems.map((i) => i.minutes),
        backgroundColor: palette.teal,
        borderRadius: 6,
        maxBarThickness: 36,
      },
    ],
  };

  const activityBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: palette.text, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: palette.grid },
        ticks: { color: palette.text, font: { size: 11 }, callback: (v) => `${v}m` },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        titleColor: palette.heading,
        bodyColor: palette.text,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} minutes studied`,
        },
      },
    },
  };

  const gapBarData = {
    labels: gapItems.map((i) => i.skillName),
    datasets: [
      {
        label: 'Current Level',
        data: gapItems.map((i) => i.currentLevel),
        backgroundColor: palette.indigo,
        borderRadius: 5,
        maxBarThickness: 24,
      },
      {
        label: 'Target Level',
        data: gapItems.map((i) => i.targetLevel),
        backgroundColor: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(161, 161, 170, 0.35)',
        borderRadius: 5,
        maxBarThickness: 24,
      },
    ],
  };

  const gapBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: palette.text, font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 5,
        grid: { color: palette.grid },
        ticks: { stepSize: 1, color: palette.text, font: { size: 11 }, callback: (v) => `L${v}` },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: palette.text, boxWidth: 12, padding: 14, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        titleColor: palette.heading,
        bodyColor: palette.text,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        callbacks: {
          afterBody: (items) => {
            const idx = items?.[0]?.dataIndex;
            const g = gapItems[idx];
            if (!g) return '';
            return g.gap > 0 ? `Skill gap: ${g.gap} level(s)` : 'Target achieved';
          },
        },
      },
    },
  };

  const hasActivities = activityItems.some((i) => i.minutes > 0);
  const hasSnapshots = growthSeries.some((p) => p.avgSkillScore !== null || p.minutesLogged > 0);
  const highGapCount = gapItems.filter((g) => g.gap >= 2).length;

  return (
    <section className="space-y-4" aria-label="Skill analytics charts">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
            Visual Skill Analytics
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
            Live charts generated from your tracked skill goals, roadmap progress, and logged study activities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* A. Skill Proficiency Radar Chart */}
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Skill Proficiency Radar
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                Current proficiency vs target level (1–5 scale)
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-500 dark:text-[#94A3B8] tabular-nums">
              {radarItems.length} skills
            </span>
          </div>
          <div className="h-64 relative">
            {radarItems.length >= 3 ? (
              <Radar data={radarData} options={radarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-center px-4 text-xs text-zinc-500 dark:text-[#94A3B8]">
                Add at least 3 tracked skills to render your multi-skill proficiency radar polygon.
              </div>
            )}
          </div>
        </div>

        {/* B. Skill Growth Line Chart */}
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Skill Growth Over Time
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                Proficiency score &amp; study minutes progression
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-zinc-100 dark:bg-[#111827] border border-transparent dark:border-[#334155] rounded-lg shrink-0">
              {['weekly', 'monthly'].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={loadingRange}
                  onClick={() => onRangeChange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    range === r
                      ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                      : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  {r === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 relative">
            {hasSnapshots ? (
              <Line data={growthData} options={growthOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-center px-4 text-xs text-zinc-500 dark:text-[#94A3B8]">
                Add a skill or log a learning activity to start plotting your growth trajectory.
              </div>
            )}
          </div>
        </div>

        {/* C. Learning Activity Bar Chart */}
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Learning Time by Skill
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                Verified study &amp; mentoring minutes invested per topic
              </p>
            </div>
            <span className="font-mono text-xs text-emerald-700 dark:text-[#2DD4BF] tabular-nums">
              {activityItems.reduce((s, a) => s + a.minutes, 0)}m total
            </span>
          </div>
          <div className="h-64 relative">
            {hasActivities ? (
              <Bar data={activityBarData} options={activityBarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-center px-4 text-xs text-zinc-500 dark:text-[#94A3B8]">
                Log your first learning activity to visualize study time distribution across skills.
              </div>
            )}
          </div>
        </div>

        {/* D. Skill Gap Chart */}
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Skill Gap Comparison
              </h3>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                Current vs target level · highlights high-gap focus areas
              </p>
            </div>
            {highGapCount > 0 && (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 tabular-nums whitespace-nowrap">
                {highGapCount} high-gap skill{highGapCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="h-64 relative">
            {gapItems.length > 0 ? (
              <Bar data={gapBarData} options={gapBarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-center px-4 text-xs text-zinc-500 dark:text-[#94A3B8]">
                Track skills with current and target proficiency levels to measure gaps.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
