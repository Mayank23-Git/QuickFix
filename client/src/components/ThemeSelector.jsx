import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const THEME_OPTIONS = [
  { id: 'light', label: 'Light Mode', shortLabel: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark Mode', shortLabel: 'Dark', icon: Moon },
  { id: 'system', label: 'System Default', shortLabel: 'System', icon: Monitor },
];

export function ThemeSelector({ variant = 'dropdown', align = 'right' }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label="Theme preference"
        className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-[#111827] border border-zinc-200 dark:border-[#334155]"
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                  : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600 dark:text-[#818CF8]' : ''}`} />
              <span>{opt.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact-segmented') {
    return (
      <div
        role="group"
        aria-label="Theme preference"
        className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-[#0F172A] border border-zinc-200 dark:border-[#334155]"
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              aria-pressed={active}
              title={opt.label}
              className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                  : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-indigo-600 dark:text-[#818CF8]' : ''}`} />
              <span>{opt.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const current = THEME_OPTIONS.find((opt) => opt.id === theme) || THEME_OPTIONS[2];
  const CurrentIcon = current.icon;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Theme: ${current.label}. Switch theme`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-[#273449] transition-colors whitespace-nowrap shrink-0"
      >
        <CurrentIcon className="w-4 h-4 text-indigo-600 dark:text-[#818CF8]" />
        <span className="hidden sm:inline">{current.shortLabel}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Select color theme"
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-44 bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl shadow-sm z-50 p-1.5 space-y-0.5`}
        >
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(opt.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-indigo-50 dark:bg-[#273449] text-indigo-700 dark:text-[#818CF8]'
                    : 'text-zinc-700 dark:text-[#F8FAFC] hover:bg-zinc-50 dark:hover:bg-[#273449]/70'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{opt.label}</span>
                </span>
                {active && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-[#2DD4BF]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
