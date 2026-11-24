import {
  Award,
  BookOpen,
  Code2,
  Compass,
  Cpu,
  Flame,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';

const ICON_MAP = {
  award: Award,
  'book-open': BookOpen,
  users: Users,
  lightbulb: Lightbulb,
  trophy: Trophy,
  cpu: Cpu,
  'shield-check': ShieldCheck,
  'code-2': Code2,
  compass: Compass,
  flame: Flame,
  target: Target,
  'trending-up': TrendingUp,
  sparkles: Sparkles,
};

export function BadgeIcon({ icon = 'award', className = 'w-5 h-5' }) {
  const Icon = ICON_MAP[icon] || Award;
  return <Icon className={className} aria-hidden="true" />;
}
