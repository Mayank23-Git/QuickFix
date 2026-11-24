export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'QF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatStatusLabel(status) {
  if (status === 'Claimed') return 'Accepted';
  if (status === 'Open') return 'Pending Acceptance';
  return status || 'Pending Acceptance';
}

export function getStatusLabelStyle(status) {
  switch (status) {
    case 'Open':
    case 'Pending Acceptance':
      return 'text-indigo-700 dark:text-[#818CF8] font-medium';
    case 'Claimed':
    case 'Accepted':
      return 'text-amber-700 dark:text-amber-300 font-medium';
    case 'Ready to Join':
      return 'text-indigo-700 dark:text-[#818CF8] font-medium';
    case 'In Progress':
      return 'text-emerald-700 dark:text-[#2DD4BF] font-medium';
    case 'Resolved':
    case 'Completed':
      return 'text-zinc-600 dark:text-[#94A3B8] font-medium';
    case 'Cancelled':
      return 'text-rose-700 dark:text-rose-300 font-medium';
    default:
      return 'text-zinc-600 dark:text-[#94A3B8]';
  }
}

export function getUrgencyLabelStyle(urgency) {
  switch (urgency) {
    case 'High':
      return 'text-rose-700 dark:text-rose-300 font-medium';
    case 'Medium':
      return 'text-amber-700 dark:text-amber-300 font-medium';
    case 'Low':
      return 'text-zinc-600 dark:text-[#94A3B8]';
    default:
      return 'text-zinc-600 dark:text-[#94A3B8]';
  }
}
