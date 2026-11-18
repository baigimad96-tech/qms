import { jsPDF } from 'jspdf';
import { LOGO_BASE64 } from '../assets/logoBase64.js';

/**
 * Generates a high-fidelity branded Qurbani Hissa Receipt PDF
 * featuring the official JIH logo, stylized header, golden Day badge,
 * and comprehensive allocation/cost breakdown.
 *
 * @param {Object} booking - The booking object
 * @returns {jsPDF} The jsPDF document instance
 */
export function generateBrandedReceiptPdf(booking) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm

  // 1. Logo on the left
  const logoH = 26;
  const logoW = logoH * (372 / 537); // ~18mm preserving aspect ratio
  try {
    doc.addImage(LOGO_BASE64, 'JPEG', margin, 14, logoW, logoH);
  } catch (err) {
    console.warn('Failed to render logo in receipt:', err);
  }

  // 2. Center Title & Subtitle
  doc.setTextColor(22, 57, 126); // Deep Navy Blue (#16397e)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('QURBANI HISSA RECEIPT', pageWidth / 2, 23, { align: 'center' });

  doc.setTextColor(100, 116, 139); // Slate Gray (#64748b)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Booking Confirmation & Allocation Details', pageWidth / 2, 29, { align: 'center' });

  // 3. Right: Circular Gold Badge for Day
  const dayStr =
    String(booking.day || booking.qurbaniDay || booking.qurbaniDayId || '1').replace(/\D/g, '') || '1';
  const circleCenterX = pageWidth - margin - 12;
  const circleCenterY = 25;
  const circleRadius = 11;

  doc.setDrawColor(194, 139, 42); // Gold / Amber outline (#c28b2a)
  doc.setLineWidth(1.2);
  doc.circle(circleCenterX, circleCenterY, circleRadius, 'S');

  doc.setTextColor(156, 163, 175); // Light Gray for DAY (#9ca3af)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DAY', circleCenterX, circleCenterY - 2.5, { align: 'center' });

  doc.setTextColor(107, 114, 128); // Slate Gray for Day number (#6b7280)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(dayStr, circleCenterX, circleCenterY + 4.5, { align: 'center' });

  // 4. Blue Horizontal Divider Rule
  const lineY = 46;
  doc.setDrawColor(22, 57, 126); // Deep Navy Blue (#16397e)
  doc.setLineWidth(1.2);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  // Format Booking Date: DD-MM-YYYY
  let bookingDate = '06-10-2026';
  if (booking.createdAt || booking.date) {
    try {
      const d = new Date(booking.createdAt || booking.date);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        bookingDate = `${day}-${month}-${year}`;
      }
    } catch {
      // keep fallback
    }
  }

  const receiptNumber = booking.receiptNumber || String(booking.hissaBookingId || booking.id);
  const personName = booking.qurbaniPersonName || booking.personName || 'Anonymous';
  const bookedBy = booking.bookedByAdminName || booking.bookedBy || 'System Administrator';
  const animalType = booking.animalType || booking.animal || 'Animal';
  const hissaCount = Number(booking.totalHissa || booking.hissa || 1);
  const perCost = Number(
    booking.perHissaCost !== undefined && booking.perHissaCost > 0
      ? booking.perHissaCost
      : (booking.totalHissaCost || booking.cost || 0) / (hissaCount || 1)
  );
  const totalCost = Number(
    booking.totalHissaCost !== undefined
      ? booking.totalHissaCost
      : booking.cost !== undefined
      ? booking.cost
      : perCost * hissaCount
  );
  const meatWanted =
    typeof booking.meatWanted === 'boolean'
      ? booking.meatWanted
        ? 'Yes'
        : 'No'
      : booking.meatWanted || 'Yes';

  // 5. Booking Metadata Section
  let y = 56;
  const col1X = margin;
  const col2X = margin + contentWidth / 2 + 5;

  const renderField = (label, val, x, currY) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(label + ':', x, currY);
    const labelW = doc.getTextWidth(label + ': ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(String(val || 'N/A'), x + labelW, currY);
  };

  renderField('Receipt No', receiptNumber, col1X, y);
  renderField('Qurbani Person', personName, col2X, y);
  y += 7.5;

  renderField('Booking Date', bookingDate, col1X, y);
  renderField('Booked By', bookedBy, col2X, y);
  y += 7.5;

  renderField('Animal Type', animalType, col1X, y);
  renderField('Qurbani Day', `Day ${dayStr}`, col2X, y);
  y += 14;

  // 6. Items Table
  const tableTopY = y;
  const tableH = 10;
  doc.setFillColor(248, 250, 252); // Soft gray/blue header background (#f8fafc)
  doc.rect(margin, tableTopY, contentWidth, tableH, 'F');

  doc.setDrawColor(226, 232, 240); // Border color (#e2e8f0)
  doc.setLineWidth(0.3);
  doc.rect(margin, tableTopY, contentWidth, tableH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Hissa', margin + 18, tableTopY + 6.5, { align: 'center' });
  doc.text('Per Hissa Cost', margin + contentWidth / 2, tableTopY + 6.5, { align: 'center' });
  doc.text('Amount', pageWidth - margin - 8, tableTopY + 6.5, { align: 'right' });

  // Table Row
  const rowY = tableTopY + tableH;
  const rowH = 10;
  doc.rect(margin, rowY, contentWidth, rowH, 'S');

  doc.setFont('helvetica', 'normal');
  doc.text(String(hissaCount), margin + 18, rowY + 6.5, { align: 'center' });
  doc.text(
    `INR ${perCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    margin + contentWidth / 2,
    rowY + 6.5,
    { align: 'center' }
  );
  doc.text(
    `INR ${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin - 8,
    rowY + 6.5,
    { align: 'right' }
  );

  y = rowY + rowH + 12;

  // 7. Summary & Meat Wanted
  doc.setFont('helvetica', 'bold');
  doc.text('Meat Wanted: ', margin, y);
  const mwWidth = doc.getTextWidth('Meat Wanted: ');
  doc.setFont('helvetica', 'normal');
  doc.text(meatWanted, margin + mwWidth, y);

  const sumColLabelX = pageWidth - margin - 55;
  const sumColValX = pageWidth - margin;

  doc.setFont('helvetica', 'bold');
  doc.text('Total Hissa:', sumColLabelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(hissaCount), sumColValX, y, { align: 'right' });
  y += 6.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Per Hissa Cost:', sumColLabelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `INR ${perCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    sumColValX,
    y,
    { align: 'right' }
  );
  y += 7.5;

  doc.setTextColor(22, 57, 126); // Blue highlight for total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total Amount:', sumColLabelX, y);
  doc.text(
    `INR ${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    sumColValX,
    y,
    { align: 'right' }
  );

  // 8. Footer divider & note
  y += 20;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'This document is an official Qurbani Hissa Booking Receipt. All monetary amounts are in Indian Rupees (INR).',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  return doc;
}

/**
 * Downloads the branded PDF receipt for a given hissa booking.
 *
 * @param {Object} booking - The booking object
 * @returns {Promise<string>} The filename downloaded
 */
export async function downloadReceipt(booking) {
  if (!booking) {
    throw new Error('No booking specified.');
  }

  const filename = `${booking.receiptNumber || `QB-${booking.hissaBookingId || booking.id}`}.pdf`;

  try {
    const doc = generateBrandedReceiptPdf(booking);
    doc.save(filename);
    return filename;
  } catch (err) {
    console.error('Failed to generate branded receipt PDF:', err);
    throw new Error(err.message || 'Failed to generate PDF receipt.');
  }
}
