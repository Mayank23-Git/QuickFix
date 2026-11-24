import { Link } from 'react-router-dom';
import { ArrowRight, Compass, RefreshCw, Sparkles, Users } from 'lucide-react';
import { Avatar } from '../Avatar.jsx';

export function AiRecommendationsSection({
  recommendations,
  analyzing,
  onRunAnalysis,
}) {
  const peerMentors = recommendations?.peerMentors || [];
  const opportunities = recommendations?.practiceOpportunities || [];
  const biggestGaps = recommendations?.biggestGaps || [];
  const nextSteps = recommendations?.nextSteps || [];
  const helpedSkills = recommendations?.helpedSkills || [];

  return (
    <section className="space-y-4" aria-label="AI recommendations for you">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
              AI Recommendations For You
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
            Personalized focus areas, matched campus mentors, and live QuickFix practice opportunities
            {recommendations?.source
              ? ` · ${recommendations.source === 'ai' ? 'Gemini AI analysis' : 'Smart profile analysis'}`
              : ''}
          </p>
        </div>

        <button
          type="button"
          disabled={analyzing}
          onClick={onRunAnalysis}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
          <span>{analyzing ? 'Analyzing...' : 'Run AI Analysis'}</span>
        </button>
      </div>

      {/* Priority Summary & Action Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-[#334155]">
            <div>
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Top priority skill</p>
              <p className="font-display text-base font-semibold text-indigo-700 dark:text-[#818CF8]">
                {recommendations?.prioritySkill || 'Select or add a skill'}
              </p>
            </div>
            {helpedSkills.length > 0 && (
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                Mentoring strengths: {helpedSkills.map((h) => `${h.name} (${h.count})`).join(', ')}
              </p>
            )}
          </div>

          <p className="text-sm text-zinc-700 dark:text-slate-200 leading-relaxed">
            {recommendations?.summary}
          </p>

          {biggestGaps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-[#94A3B8]">
                Biggest Skill Gaps
              </h3>
              <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                {biggestGaps.map((g, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-zinc-900 dark:text-[#F8FAFC]">{g.skillName}</span>
                      {g.gap !== undefined && (
                        <span className="font-mono text-amber-700 dark:text-amber-300 tabular-nums">
                          L{g.currentLevel} → L{g.targetLevel} (Gap {g.gap})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-[#94A3B8]">{g.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nextSteps.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-[#334155]">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-[#94A3B8]">
                Recommended Next Steps
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-700 dark:text-slate-200">
                {nextSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Matched QuickFix Peer Mentors & Open Doubt Practice */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  Matched Peer Mentors
                </h3>
              </div>
              <Link
                to="/peers"
                className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:underline"
              >
                All peers
              </Link>
            </div>

            {peerMentors.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                No peer mentors matched yet. Add skills or check the peer directory.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                {peerMentors.map((mentor) => (
                  <Link
                    key={mentor._id}
                    to={`/profile/${mentor._id}`}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:opacity-85 transition-opacity"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={mentor.avatarUrl} name={mentor.fullName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-[#F8FAFC] truncate">
                          {mentor.fullName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] truncate">
                          {mentor.reason}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600 dark:text-[#2DD4BF]" aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                  Practice &amp; Mentoring Opportunities
                </h3>
              </div>
              <Link
                to="/doubts"
                className="text-xs font-medium text-indigo-600 dark:text-[#818CF8] hover:underline"
              >
                Doubt board
              </Link>
            </div>

            {opportunities.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">
                No open doubts matching your skills right now. Post a doubt or browse the board.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-[#334155]">
                {opportunities.map((opp) => (
                  <Link
                    key={opp._id}
                    to={`/doubts/${opp._id}`}
                    className="py-2.5 first:pt-0 last:pb-0 block hover:opacity-85 transition-opacity space-y-0.5"
                  >
                    <p className="text-xs font-medium text-zinc-900 dark:text-[#F8FAFC] line-clamp-1">
                      {opp.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] tabular-nums">
                      {opp.skillName} · {opp.mode} · +{opp.bountyPoints} pts
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
