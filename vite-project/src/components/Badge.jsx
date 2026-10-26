import React from 'react';

export default function Badge({ status }) {
  const safeStatus = typeof status === 'string' ? status : String(status || '—');
  const styles =
    safeStatus === 'Available'
      ? 'bg-[#e8f3e9] text-[#28704d]'
      : safeStatus === 'Almost Full'
      ? 'bg-[#fff2d8] text-[#9a6a1f]'
      : safeStatus === 'Full'
      ? 'bg-[#fde8e5] text-[#a5473e]'
      : 'bg-[#edf1eb] text-[#527064] dark:bg-[#1a382e] dark:text-[#8ba79b]';

  const testId =
    safeStatus && safeStatus !== '—'
      ? safeStatus.toLowerCase().replace(/\s+/g, '-')
      : 'unknown';

  return (
    <span
      data-testid={`status-${testId}`}
      className={`inline-flex items-center justify-center text-center rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}
    >
      {safeStatus}
    </span>
  );
}
