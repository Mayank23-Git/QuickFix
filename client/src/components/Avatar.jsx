import { useState } from 'react';
import { getInitials } from '../utils/badges.js';

export function Avatar({ src, name = '', size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[11px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const dims = sizeClasses[size] || sizeClasses.md;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name ? `${name} profile portrait` : 'Student avatar'}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${dims} rounded-full object-cover border border-zinc-200 dark:border-[#334155] bg-zinc-100 dark:bg-[#273449] shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name ? `${name} avatar` : 'Student avatar'}
      className={`${dims} rounded-full bg-indigo-50 dark:bg-[#818CF8]/15 text-indigo-700 dark:text-[#818CF8] border border-indigo-200 dark:border-[#818CF8]/35 font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
