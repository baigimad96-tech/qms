import React from 'react';

export default function Badge({ status }) {
  const styles =
    status === 'Available'
      ? 'bg-[#e8f3e9] text-[#28704d]'
      : status === 'Almost Full'
      ? 'bg-[#fff2d8] text-[#9a6a1f]'
      : status === 'Full'
      ? 'bg-[#fde8e5] text-[#a5473e]'
      : 'bg-[#edf1eb] text-[#527064]';

  return (
    <span
      data-testid={`status-${status.toLowerCase().replace(' ', '-')}`}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}
    >
      {status}
    </span>
  );
}
