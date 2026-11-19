import React from 'react';
import { Users, User, PlusCircle, MinusCircle, ArrowRight } from 'lucide-react';

function safeParse(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }
  }
  return val;
}

export function AuditMemberDiffViewer({ log, oldPayload: propOld, newPayload: propNew }) {
  if (!log) return null;

  const oldP = propOld !== undefined ? propOld : safeParse(log.oldValue);
  const newP = propNew !== undefined ? propNew : safeParse(log.newValue);

  const oldMembers = Array.isArray(oldP?.members) ? oldP.members : [];
  const newMembers = Array.isArray(newP?.members) ? newP.members : [];

  const oldSummary = oldP?.familyMembersSummary;
  const newSummary = newP?.familyMembersSummary;

  const hasOld = oldMembers.length > 0 || Boolean(oldSummary);
  const hasNew = newMembers.length > 0 || Boolean(newSummary);

  if (!hasOld && !hasNew) {
    return (
      <div className="py-2 text-xs text-[#7b867e] dark:text-[#8ba79b] italic">
        No family members recorded for this event.
      </div>
    );
  }

  // Pre-calculate totals
  const totalOldHissas = oldMembers.reduce((sum, m) => sum + (Number(m.hissaCount) || 1), 0);
  const totalNewHissas = newMembers.reduce((sum, m) => sum + (Number(m.hissaCount) || 1), 0);

  // Build lookup maps by trimmed lowercase member name
  const oldMap = new Map();
  oldMembers.forEach((m) => {
    const key = (m.memberName || '').trim().toLowerCase();
    if (key) oldMap.set(key, m);
  });

  const newMap = new Map();
  newMembers.forEach((m) => {
    const key = (m.memberName || '').trim().toLowerCase();
    if (key) newMap.set(key, m);
  });

  return (
    <div className="rounded-xl border border-[#ded8ca] bg-[#fbf9f4] p-3.5 sm:p-4 dark:border-[#21473a] dark:bg-[#122820]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee8dc] pb-2.5 dark:border-[#1a3d31]">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#246b59]/10 text-[#246b59] dark:bg-[#52c99a]/10 dark:text-[#52c99a]">
            <Users size={15} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#183f35] dark:text-[#edf6f2]">
              Family Members Comparison
            </h4>
            <p className="text-[11px] text-[#7b867e] dark:text-[#8ba79b]">
              Member allocations before and after this update
            </p>
          </div>
        </div>
      </div>

      {/* Compact Summary Difference (Single Line Flow) */}
      {(oldSummary || newSummary) && (
        <div className="my-3 rounded-lg border border-[#ded8ca] bg-white/70 p-2.5 text-xs dark:border-[#21473a] dark:bg-[#153428]/60 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <span className="font-bold text-[#7b867e] dark:text-[#8ba79b] shrink-0 text-[11px] uppercase tracking-wide">
            Summary:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-medium text-rose-700 dark:text-rose-400 line-through opacity-80 break-words [overflow-wrap:anywhere]">
              {oldSummary || 'None'}
            </span>
            <span className="text-[#8a948e] dark:text-[#698d80] font-bold">→</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 break-words [overflow-wrap:anywhere]">
              {newSummary || 'None'}
            </span>
          </div>
        </div>
      )}

      {/* Side-by-Side (Desktop) / Stacked (Mobile) Itemized Member Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {/* Previous Allocation (Before) */}
        <div className="rounded-xl border border-rose-200/80 bg-white/80 p-3 dark:border-rose-900/40 dark:bg-[#153428]/60">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-2 flex flex-wrap justify-between items-center gap-1 border-b border-rose-100 dark:border-rose-900/30 pb-1.5">
            <span>BEFORE UPDATE</span>
            <span className="rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 px-2 py-0.5 text-[10px] font-semibold">
              {oldMembers.length} {oldMembers.length === 1 ? 'Member' : 'Members'} · {totalOldHissas} Hissas
            </span>
          </div>

          {oldMembers.length === 0 ? (
            <p className="text-xs text-[#7b867e] dark:text-[#8ba79b] italic py-2">No previous members</p>
          ) : (
            <ul className="divide-y divide-[#eee8dc] dark:divide-[#1e4636] text-xs">
              {oldMembers.map((m, idx) => {
                const nameKey = (m.memberName || '').trim().toLowerCase();
                const isRemoved = !newMap.has(nameKey);
                const newMatching = newMap.get(nameKey);
                const hasHissaChanged = newMatching && Number(newMatching.hissaCount) !== Number(m.hissaCount);

                return (
                  <li key={m.bookingMemberId ?? idx} className="py-2 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User size={13} className="shrink-0 text-rose-500 dark:text-rose-400" />
                      <span className="font-semibold text-[#183f35] dark:text-[#edf6f2] truncate" title={m.memberName}>
                        {m.memberName}
                      </span>
                      {isRemoved && (
                        <span className="rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 text-[9px] font-bold">
                          Removed
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-rose-200/60 dark:border-rose-900/40">
                      {m.hissaCount} {Number(m.hissaCount) === 1 ? 'Hissa' : 'Hissas'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Updated Allocation (After) */}
        <div className="rounded-xl border border-emerald-200/80 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-[#153428]/60">
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex flex-wrap justify-between items-center gap-1 border-b border-emerald-100 dark:border-emerald-900/30 pb-1.5">
            <span>AFTER UPDATE</span>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
              {newMembers.length} {newMembers.length === 1 ? 'Member' : 'Members'} · {totalNewHissas} Hissas
            </span>
          </div>

          {newMembers.length === 0 ? (
            <p className="text-xs text-[#7b867e] dark:text-[#8ba79b] italic py-2">No updated members</p>
          ) : (
            <ul className="divide-y divide-[#eee8dc] dark:divide-[#1e4636] text-xs">
              {newMembers.map((m, idx) => {
                const nameKey = (m.memberName || '').trim().toLowerCase();
                const isNew = !oldMap.has(nameKey);
                const oldMatching = oldMap.get(nameKey);
                const hasHissaChanged = oldMatching && Number(oldMatching.hissaCount) !== Number(m.hissaCount);

                return (
                  <li key={m.bookingMemberId ?? idx} className="py-2 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User size={13} className="shrink-0 text-emerald-500 dark:text-emerald-400" />
                      <span className="font-semibold text-[#183f35] dark:text-[#edf6f2] truncate" title={m.memberName}>
                        {m.memberName}
                      </span>
                      {isNew && (
                        <span className="rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold">
                          + Added
                        </span>
                      )}
                      {hasHissaChanged && (
                        <span className="rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 text-[9px] font-bold">
                          Hissa Changed
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-emerald-200/60 dark:border-emerald-900/40">
                      {m.hissaCount} {Number(m.hissaCount) === 1 ? 'Hissa' : 'Hissas'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditMemberDiffViewer;
