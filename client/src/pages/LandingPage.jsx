import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Video, Users, CheckCircle2, Clock } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { DoubtCard } from '../components/DoubtCard.jsx';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [recentDoubts, setRecentDoubts] = useState([]);
  const [stats, setStats] = useState({ totalOpenDoubts: 0, totalCompletedSessions: 0, totalStudents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadLandingData() {
      try {
        const [reqData, lbData] = await Promise.all([
          apiRequest('/api/requests?status=Open'),
          apiRequest('/api/leaderboard'),
        ]);
        if (!active) return;
        setRecentDoubts((reqData.requests || []).slice(0, 4));
        if (lbData.stats) setStats(lbData.stats);
      } catch {
        // Keep graceful fallback state
      } finally {
        if (active) setLoading(false);
      }
    }
    loadLandingData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PublicLayout>
      {/* Hero Split */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-14 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-xs font-medium tracking-wide text-indigo-700 dark:text-[#818CF8]">
              Campus Peer-to-Peer Mentoring · Free 15-Minute Sessions
            </p>

            <h1 className="font-display text-[clamp(2.15rem,3.8vw,3.25rem)] font-bold tracking-tight text-zinc-900 dark:text-[#F8FAFC] leading-[1.12] [text-wrap:balance]">
              Solve coding and coursework doubts with a classmate in 15 minutes.
            </h1>

            <p className="text-base sm:text-lg text-zinc-600 dark:text-[#94A3B8] leading-relaxed max-w-xl">
              Stop spending hours digging through generic forums. Post your specific bug or concept blocker, get matched with peers who already know the topic, and jump into a live Jitsi video call together.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link
                to={isAuthenticated ? '/dashboard' : '/signup'}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] dark:text-[#0F172A] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>{isAuthenticated ? 'Go to Dashboard' : 'Join Campus Board'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/doubts"
                className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-[#273449] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Browse Open Doubts</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[280px] sm:min-h-[340px] rounded-xl overflow-hidden border border-zinc-200 dark:border-[#334155] bg-zinc-100 dark:bg-[#1E293B]">
              <img
                src="/src/assets/images/hero_campus_mentoring_1795456563756.jpg"
                alt="Two college students collaborating over code and course notes at a library desk"
                referrerPolicy="no-referrer"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Full-width 4-column live platform strip */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-5">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Open Doubts</p>
            <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
              {stats.totalOpenDoubts}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Completed Sessions</p>
            <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
              {stats.totalCompletedSessions}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Registered Students</p>
            <p className="font-mono text-2xl font-semibold text-zinc-900 dark:text-[#F8FAFC] tabular-nums">
              {stats.totalStudents}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-[#94A3B8]">Session Format</p>
            <p className="font-mono text-2xl font-semibold text-indigo-700 dark:text-[#818CF8] tabular-nums">
              15 min
            </p>
          </div>
        </div>
      </section>

      {/* How PeerUp Works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-zinc-200 dark:border-[#334155]">
        <div className="max-w-2xl space-y-2 mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-[#F8FAFC] [text-wrap:balance]">
            Structured around short, high-focus peer sessions
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-[#94A3B8]">
            Every doubt moves cleanly from open request to live screen-sharing call and verified completion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <p className="font-mono text-xs font-medium text-indigo-600 dark:text-[#818CF8]">01. Post & Match</p>
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Describe the exact bug, proof, or query
              </h3>
              <p className="text-sm text-zinc-600 dark:text-[#94A3B8] leading-relaxed">
                Select a skill from the campus catalog, mark urgency, and optionally add bounty points. QuickFix scores and surfaces helpers whose actual profiles match the skill and related prerequisites.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-[#94A3B8]" />
                Real profile skill matching
              </span>
              <span aria-hidden="true">·</span>
              <span>Atomic single-helper claiming</span>
            </div>
          </div>

          <div className="md:col-span-5 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <p className="font-mono text-xs font-medium text-indigo-600 dark:text-[#818CF8]">02. Live Video Call</p>
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                15-minute Jitsi Meet room
              </h3>
              <p className="text-sm text-zinc-600 dark:text-[#94A3B8] leading-relaxed">
                Claiming a request generates a dedicated Jitsi Meet conference room with mic, camera, screen sharing, and a persisted 15-minute timer.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-2 text-xs text-zinc-500 dark:text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-zinc-400 dark:text-[#94A3B8]" />
                Public Jitsi Meet (free)
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-[#94A3B8]" />
                Persisted clock
              </span>
            </div>
          </div>

          <div className="md:col-span-12 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="font-mono text-xs font-medium text-indigo-600 dark:text-[#818CF8]">03. Verified Resolution & Contribution Points</p>
              <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-[#F8FAFC]">
                Earn +20 base points plus bounty rewards after session completion
              </h3>
              <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">
                Points and skill badges are calculated and credited strictly on the server once a live mentoring session completes.
              </p>
            </div>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC] whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>View Campus Leaderboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Doubt Preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-t border-zinc-200 dark:border-[#334155]">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-[#F8FAFC]">
              Latest open doubts on the board
            </h2>
            <p className="text-sm text-zinc-600 dark:text-[#94A3B8] mt-1">
              Real questions waiting for a 15-minute peer walkthrough.
            </p>
          </div>
          <Link
            to="/doubts"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-[#818CF8] hover:text-indigo-700 dark:hover:text-[#A5B4FC] whitespace-nowrap"
          >
            <span>See all doubts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-44 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentDoubts.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl p-8 text-center">
            <p className="text-sm text-zinc-600 dark:text-[#94A3B8]">No open doubts right now. Be the first to post a question.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentDoubts.map((doubt) => (
              <DoubtCard key={doubt._id} doubt={doubt} />
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
