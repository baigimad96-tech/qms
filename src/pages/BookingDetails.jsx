import React from 'react';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { formatNumber, formatMoney, formatDateTime } from '../data/mockData.js';

export default function BookingDetails({
  booking,
  onClose,
  onDownload,
  onDelete,
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

  const fields = [
    ['Booking ID', booking.receiptNumber || booking.id || booking.hissaBookingId],
    ['Animal', displayAnimal],
    ['Qurbani Day', displayDay],
    ['Qurbani Person Name', booking.qurbaniPersonName || booking.personName],
    ['Total Hissa', formatNumber(hissaCount)],
    ['Total Hissa Cost', formatMoney(totalCost)],
    ['Meat Wanted', displayMeat],
    ['Booked By Admin', booking.bookedByAdminName || booking.bookedBy || 'System Administrator'],
    ['Created At', formatDateTime(booking.createdAt)],
    ['Updated At', formatDateTime(booking.updatedAt || booking.createdAt)],
  ];

  return (
    <Modal title="Booking details" description="Confirmed Hissa record" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="soft-inset rounded-xl p-4">
            <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">{label}</p>
            <p
              data-testid={`text-booking-detail-${label.toLowerCase().replaceAll(' ', '-')}`}
              className="mt-1 font-bold text-[#315246] dark:text-[#edf6f2]"
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[#eee8dc] pt-5 dark:border-[#1a3d31]">
        <div className="text-xs font-mono text-[#8a948e] dark:text-[#789d8e]">
          Receipt: {booking.receiptNumber || booking.id}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          <button
            type="button"
            data-testid="button-modal-close"
            onClick={onClose}
            className="btn-secondary justify-center text-xs"
          >
            Close
          </button>
          {onDelete && (
            <button
              type="button"
              data-testid="button-delete-booking-details"
              onClick={() => onDelete(booking)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dc2626]/30 bg-[#fff5f5] px-3.5 py-2 text-xs font-bold text-[#dc2626] transition hover:bg-[#fee2e2] dark:border-[#dc2626]/40 dark:bg-[#331414] dark:text-[#fca5a5] dark:hover:bg-[#451a1a]"
            >
              <Trash2 size={14} />
              <span>Delete Booking</span>
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              data-testid="button-download-receipt-details"
              onClick={() => onDownload(booking)}
              disabled={isDownloading}
              className="btn-primary justify-center flex items-center gap-2 text-xs"
            >
              {isDownloading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
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
