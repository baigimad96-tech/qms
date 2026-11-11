import React from 'react';
import { Download, RefreshCw, Trash2, Building2, Users, Pencil } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { formatNumber, formatMoney, formatDateTime } from '../data/mockData.js';

export default function BookingDetails({
  booking,
  onClose,
  onDownload,
  onDelete,
  onEdit,
  isDownloading = false,
}) {
  if (!booking) return null;

  const displayAnimal =
    typeof booking.animal === 'object' && booking.animal !== null
      ? booking.animal.animalType
      : (booking.animal || booking.animalType || 'Buffalo');

  const displayDay =
    typeof booking.qurbaniDay === 'object' && booking.qurbaniDay !== null
      ? `Day ${booking.qurbaniDay.dayNumber}`
      : (booking.day || (booking.qurbaniDayId ? `Day ${booking.qurbaniDayId}` : 'Day 1'));

  const displayMeat =
    typeof booking.meatWanted === 'boolean'
      ? (booking.meatWanted ? 'Yes' : 'No')
      : (booking.meatWanted || 'Yes');

  const hissaCount = booking.totalHissa !== undefined ? booking.totalHissa : (booking.hissa || 1);
  const totalCost = booking.totalHissaCost !== undefined ? booking.totalHissaCost : (booking.cost || 0);
  const centreName = booking.collectionCentreName || booking.collectionCentre?.name || 'Central / Unassigned';
  const centreLocation =
    booking.collectionCentre?.location ||
    booking.collectionCentre?.address ||
    booking.collectionCentreLocation ||
    '';

  const receiptNo = String(booking.receiptNumber || booking.id || booking.hissaBookingId || '').replace(/^#/, '');

  const members = Array.isArray(booking.members) ? booking.members : [];
  const unitCost = hissaCount > 0 ? totalCost / hissaCount : (booking.perHissaCost || 0);

  const isFamily =
    members.length > 1 ||
    booking.bookingMode === 'multi' ||
    booking.isFamily === true ||
    (booking.qurbaniPersonName || booking.personName || '').toLowerCase().includes('family');

  const personLabel = isFamily ? 'Family Name' : 'Qurbani Person Name';

  const fields = [
    ['Receipt No', receiptNo || '—'],
    ['Animal', displayAnimal],
    ['Qurbani Day', displayDay],
    ['Collection Centre', centreName],
    [personLabel, booking.qurbaniPersonName || booking.personName],
    ['Total Hissa', formatNumber(hissaCount)],
    ['Total Hissa Cost', formatMoney(totalCost)],
    ['Meat Wanted', displayMeat],
    ['Booked By Admin', booking.bookedByAdminName || booking.bookedBy || 'System Administrator'],
    ['Created At', formatDateTime(booking.createdAt)],
  ];

  return (
    <Modal
      title="Booking details"
      description="Confirmed Hissa record"
      onClose={onClose}
      closeOnBack={false}
      maxWidth="max-w-2xl sm:max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => {
          const isCentre = label === 'Collection Centre';
          return (
            <div
              key={label}
              className="soft-inset min-w-0 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex items-center gap-1.5 text-xs text-[#78847c] dark:text-[#92b1a3]">
                {isCentre && (
                  <Building2 size={13} className="shrink-0 text-[#246b59] dark:text-[#52c99a]" />
                )}
                <span>{label}</span>
              </div>
              <p
                data-testid={`text-booking-detail-${label.toLowerCase().replaceAll(' ', '-')}`}
                className="mt-1 font-bold text-sm text-[#315246] dark:text-[#edf6f2] break-words [overflow-wrap:anywhere] leading-snug"
              >
                {value}
              </p>
              {isCentre && centreLocation && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#78847c] dark:text-[#8ba79b] break-words [overflow-wrap:anywhere]">
                  <span>📍 {centreLocation}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {members.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#eee8dc] bg-[#faf6ed]/40 p-4 dark:border-[#1e493b] dark:bg-[#132c22]/40">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#183f35] dark:text-[#edf6f2]">
              <Users size={14} className="text-[#246b59] dark:text-[#52c99a]" />
              <span>Family Members Breakdown ({members.length})</span>
            </div>
            <span className="text-xs font-bold text-[#246b59] dark:text-[#52c99a]">
              {hissaCount} {hissaCount === 1 ? 'Hissa' : 'Hissas'} total
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#eee8dc] bg-white dark:border-[#1e493b] dark:bg-[#142e24]">
            <table className="w-full text-left text-xs min-w-[340px]">
              <thead className="bg-[#f5f1e8] text-[#5b6860] dark:bg-[#183a2e] dark:text-[#92b1a3]">
                <tr>
                  <th className="p-2.5 font-bold">#</th>
                  <th className="p-2.5 font-bold">Member Name</th>
                  <th className="p-2.5 text-center font-bold">Hissa</th>
                  <th className="p-2.5 text-right font-bold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee8dc] dark:divide-[#1e493b]">
                {members.map((m, idx) => {
                  const mCount = Number(m.hissaCount) || 1;
                  return (
                    <tr key={idx} className="hover:bg-[#faf7f0] dark:hover:bg-[#16382b]">
                      <td className="p-2.5 font-mono text-[#7b867e] dark:text-[#8ba79b]">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-[#183f35] dark:text-[#edf6f2]">
                        {m.memberName || '—'}
                      </td>
                      <td className="p-2.5 text-center font-bold text-[#246b59] dark:text-[#52c99a]">
                        {mCount}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-[#183f35] dark:text-[#edf6f2]">
                        {formatMoney(mCount * unitCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3.5 border-t border-[#eee8dc] pt-5 dark:border-[#1a3d31]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-xs text-[#78847c] dark:text-[#92b1a3]">
            <span className="text-[11px] uppercase tracking-wider">Receipt No:</span>
            <span className="rounded-md bg-[#eef7f2] px-2.5 py-0.5 font-bold text-[#246b59] dark:bg-[#153427] dark:text-[#52c99a]">
              {receiptNo || '—'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#78847c] dark:text-[#92b1a3]">
            {isFamily ? `Family Booking · ${members.length} members` : 'Single Person Booking'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            data-testid="button-modal-close"
            onClick={onClose}
            className="btn-secondary h-10 px-4 text-xs sm:text-sm font-bold whitespace-nowrap"
          >
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              data-testid="button-edit-booking-details"
              onClick={() => onEdit(booking)}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#246b59]/30 bg-[#f0f8f4] px-4 text-xs sm:text-sm font-bold text-[#246b59] shadow-sm transition hover:bg-[#e2f2ea] active:scale-[0.98] dark:border-[#52c99a]/40 dark:bg-[#16382b] dark:text-[#52c99a] dark:hover:bg-[#1b4435]"
            >
              <Pencil size={15} className="shrink-0" />
              <span>Edit Booking</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              data-testid="button-delete-booking-details"
              onClick={() => onDelete(booking)}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#dc2626]/30 bg-[#fff5f5] px-4 text-xs sm:text-sm font-bold text-[#dc2626] shadow-sm transition hover:bg-[#fee2e2] active:scale-[0.98] dark:border-[#dc2626]/40 dark:bg-[#331414] dark:text-[#fca5a5] dark:hover:bg-[#451a1a]"
            >
              <Trash2 size={15} className="shrink-0" />
              <span>Delete Booking</span>
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              data-testid="button-download-receipt-details"
              onClick={() => onDownload(booking)}
              disabled={isDownloading}
              className="btn-primary h-10 px-5 text-xs sm:text-sm font-bold whitespace-nowrap flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <RefreshCw size={15} className="animate-spin shrink-0" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} className="shrink-0" />
                  <span>Download PDF Receipt</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
