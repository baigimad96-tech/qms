import { jsPDF } from 'jspdf';
import { LOGO_BASE64 } from '../assets/logoBase64.js';
import { api } from '../services/api.js';

/**
 * Safely resolves human-readable animal type string from any booking representation
 * (handles nested object, snake_case, or missing fields).
 *
 * @param {Object|string} booking
 * @returns {string} Human-readable animal name (e.g. 'Buffalo', 'Goat', 'Cow')
 */
export function resolveAnimalType(booking) {
  if (!booking) return 'Buffalo';
  if (typeof booking === 'string' && booking.trim()) return booking.trim();

  // 1. Direct string properties
  if (typeof booking.animalType === 'string' && booking.animalType.trim()) {
    return booking.animalType.trim();
  }
  if (typeof booking.animal_type === 'string' && booking.animal_type.trim()) {
    return booking.animal_type.trim();
  }
  if (typeof booking.animalName === 'string' && booking.animalName.trim()) {
    return booking.animalName.trim();
  }
  if (typeof booking.animal === 'string' && booking.animal.trim()) {
    return booking.animal.trim();
  }

  // 2. Nested animal object on booking (e.g., booking.animal = { animalType: 'Buffalo' })
  const animalObj =
    typeof booking.animal === 'object' && booking.animal !== null
      ? booking.animal
      : typeof booking.animalType === 'object' && booking.animalType !== null
      ? booking.animalType
      : null;

  if (animalObj) {
    if (typeof animalObj.animalType === 'string' && animalObj.animalType.trim()) {
      return animalObj.animalType.trim();
    }
    if (typeof animalObj.animal_type === 'string' && animalObj.animal_type.trim()) {
      return animalObj.animal_type.trim();
    }
    if (typeof animalObj.name === 'string' && animalObj.name.trim()) {
      return animalObj.name.trim();
    }
    if (typeof animalObj.type === 'string' && animalObj.type.trim()) {
      return animalObj.type.trim();
    }
    if (typeof animalObj.species === 'string' && animalObj.species.trim()) {
      return animalObj.species.trim();
    }
  }

  return 'Buffalo';
}

/**
 * Safely resolves collection centre name string from any booking representation.
 *
 * @param {Object} booking
 * @returns {string} Collection centre name (e.g. 'Central Jamia Distribution Hub' or 'Central / Unassigned')
 */
export function resolveCollectionCentre(booking) {
  if (!booking) return 'Central / Unassigned';

  // 1. Explicit string field
  if (typeof booking.collectionCentreName === 'string' && booking.collectionCentreName.trim()) {
    return booking.collectionCentreName.trim();
  }
  if (typeof booking.collection_centre_name === 'string' && booking.collection_centre_name.trim()) {
    return booking.collection_centre_name.trim();
  }
  if (typeof booking.centreName === 'string' && booking.centreName.trim()) {
    return booking.centreName.trim();
  }

  // 2. Direct string on booking.collectionCentre or booking.centre
  if (typeof booking.collectionCentre === 'string' && booking.collectionCentre.trim()) {
    return booking.collectionCentre.trim();
  }
  if (typeof booking.centre === 'string' && booking.centre.trim()) {
    return booking.centre.trim();
  }

  // 3. Nested object
  const centreObj =
    typeof booking.collectionCentre === 'object' && booking.collectionCentre !== null
      ? booking.collectionCentre
      : typeof booking.centre === 'object' && booking.centre !== null
      ? booking.centre
      : null;

  if (centreObj) {
    if (typeof centreObj.name === 'string' && centreObj.name.trim()) {
      return centreObj.name.trim();
    }
    if (typeof centreObj.centreName === 'string' && centreObj.centreName.trim()) {
      return centreObj.centreName.trim();
    }
  }

  // 4. Resolve by collectionCentreId from localStorage
  const centreId = booking.collectionCentreId || booking.collection_centre_id;
  if (centreId !== undefined && centreId !== null && centreId !== '') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('qurbani_collection_centres');
        if (stored) {
          const parsed = JSON.parse(stored);
          const match = (parsed || []).find(
            (c) => String(c.collectionCentreId || c.id) === String(centreId)
          );
          if (match && match.name) return match.name;
        }
      }
    } catch {
      // ignore
    }
  }

  return 'Central / Unassigned';
}

/**
 * Checks whether a booking represents a multi-person / family booking.
 *
 * @param {Object} booking
 * @returns {boolean}
 */
export function isMultiPersonBooking(booking) {
  if (!booking) return false;
  if (booking.bookingMode === 'multi' || booking.bookingType === 'multi' || booking.isFamily === true) {
    return true;
  }
  const members = Array.isArray(booking.members)
    ? booking.members.filter((m) => m && (m.memberName || m.name || m.fullName))
    : [];
  if (members.length > 1) {
    return true;
  }
  if (members.length === 1) {
    const rawPerson = (booking.qurbaniPersonName || booking.personName || '').trim().toLowerCase();
    const rawMember = (members[0].memberName || members[0].name || members[0].fullName || '').trim().toLowerCase();
    if (rawMember && rawPerson && rawMember !== rawPerson) {
      return true;
    }
  }
  const person = (booking.qurbaniPersonName || booking.personName || '').trim().toLowerCase();
  if (
    person.endsWith(' family') ||
    person.includes(' family ') ||
    person.startsWith('family ') ||
    person.includes('& sons') ||
    person.includes(' group')
  ) {
    return true;
  }
  return false;
}

/**
 * Generates a high-fidelity branded Qurbani Hissa Receipt PDF
 * featuring the official JIH logo, stylized header, golden Day badge,
 * metadata with Collection Centre and Family / Qurbani Person details,
 * and comprehensive allocation/cost breakdown (including family members when multiple persons book).
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
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm

  // Helper to fit text within a maxWidth with ellipsis
  const fitText = (text, maxW) => {
    const str = String(text || '');
    if (doc.getTextWidth(str) <= maxW) return str;
    let s = str;
    while (s.length > 0 && doc.getTextWidth(s + '...') > maxW) {
      s = s.slice(0, -1);
    }
    return s + '...';
  };

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

  const receiptNumber = String(booking.receiptNumber || booking.hissaBookingId || booking.id).replace(/^#/, '');

  const isMulti = isMultiPersonBooking(booking);

  // Normalize family members list
  const rawMembers = Array.isArray(booking.members) ? booking.members : [];
  const validMembers = rawMembers
    .filter((m) => m && (m.memberName || m.name || m.fullName || m.hissaCount || m.hissa))
    .map((m, idx) => ({
      memberName: String(m.memberName || m.name || m.fullName || `Family Member #${idx + 1}`).trim(),
      hissaCount: Number(m.hissaCount || m.hissa || 1),
    }));

  const personName =
    typeof booking.qurbaniPersonName === 'string' && booking.qurbaniPersonName.trim()
      ? booking.qurbaniPersonName.trim()
      : typeof booking.personName === 'string' && booking.personName.trim()
      ? booking.personName.trim()
      : typeof booking.personName === 'object' && booking.personName !== null
      ? booking.personName.name || booking.personName.fullName || 'Anonymous'
      : 'Anonymous';

  const bookedBy =
    typeof booking.bookedByAdminName === 'string' && booking.bookedByAdminName.trim()
      ? booking.bookedByAdminName.trim()
      : typeof booking.bookedBy === 'string' && booking.bookedBy.trim()
      ? booking.bookedBy.trim()
      : typeof booking.bookedBy === 'object' && booking.bookedBy !== null
      ? booking.bookedBy.fullName || booking.bookedBy.name || booking.bookedBy.username || 'System Administrator'
      : typeof booking.admin === 'object' && booking.admin !== null
      ? booking.admin.fullName || booking.admin.name || 'System Administrator'
      : 'System Administrator';

  const animalType = resolveAnimalType(booking);
  const collectionCentreName = resolveCollectionCentre(booking);

  const hissaCount = Number(
    booking.totalHissa !== undefined
      ? booking.totalHissa
      : booking.hissa !== undefined
      ? booking.hissa
      : validMembers.length > 0
      ? validMembers.reduce((sum, m) => sum + (Number(m.hissaCount) || 1), 0)
      : 1
  );

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

  // 5. Booking Metadata Section (4 Rows)
  let y = 55;
  const col1X = margin;
  const col2X = margin + contentWidth / 2 + 5;
  const colMaxW = contentWidth / 2 - 8;

  const renderField = (label, val, x, currY, maxW = colMaxW) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(label + ':', x, currY);
    const labelW = doc.getTextWidth(label + ': ');

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // Slate 700

    let displayVal = val;
    if (typeof displayVal === 'object' && displayVal !== null) {
      displayVal =
        displayVal.name ||
        displayVal.animalType ||
        displayVal.label ||
        displayVal.fullName ||
        'N/A';
    }
    const strVal = String(displayVal || 'N/A');
    const availableValW = Math.max(maxW - labelW, 20);
    const textToDraw = fitText(strVal, availableValW);

    doc.text(textToDraw, x + labelW, currY);
  };

  // Row 1: Receipt No & Family Name (if multiple person) / Qurbani Person (if single)
  renderField('Receipt No', receiptNumber, col1X, y);
  renderField(isMulti ? 'Family Name' : 'Qurbani Person', personName, col2X, y);
  y += 7.5;

  // Row 2: Booking Date & Booked By
  renderField('Booking Date', bookingDate, col1X, y);
  renderField('Booked By', bookedBy, col2X, y);
  y += 7.5;

  // Row 3: Animal Type & Qurbani Day
  renderField('Animal Type', animalType, col1X, y);
  renderField('Qurbani Day', `Day ${dayStr}`, col2X, y);
  y += 7.5;

  // Row 4: Collection Centre & Meat Wanted
  renderField('Collection Centre', collectionCentreName, col1X, y);
  renderField('Meat Wanted', meatWanted, col2X, y);
  y += 12;

  // 6. Allocation Table: Detailed Family Breakdown OR Single Summary Row
  const hasMultipleMembers = isMulti && validMembers.length > 0;

  if (hasMultipleMembers) {
    // Header label for Family Breakdown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 57, 126); // Deep Navy Blue
    doc.text('FAMILY MEMBERS BREAKDOWN', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${validMembers.length} ${validMembers.length === 1 ? 'Member' : 'Members'}  ·  ${hissaCount} ${hissaCount === 1 ? 'Hissa' : 'Hissas'} Total`,
      pageWidth - margin,
      y,
      { align: 'right' }
    );
    y += 5;

    const tableTopY = y;
    const headerH = 9;

    const drawMultiTableHeader = (headerY) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, headerY, contentWidth, headerH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.rect(margin, headerY, contentWidth, headerH, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      // Columns: # (14mm), Family Member Name (68mm), Hissa (22mm), Per Hissa Cost (33mm), Amount (33mm)
      doc.text('#', margin + 7, headerY + 6, { align: 'center' });
      doc.text('Family Member Name', margin + 17, headerY + 6);
      doc.text('Hissa', margin + 82 + 11, headerY + 6, { align: 'center' });
      doc.text('Per Hissa Cost', margin + 104 + 30, headerY + 6, { align: 'right' });
      doc.text('Amount', pageWidth - margin - 5, headerY + 6, { align: 'right' });
    };

    drawMultiTableHeader(tableTopY);

    let currRowY = tableTopY + headerH;
    const rowH = 8.5;

    validMembers.forEach((m, idx) => {
      // Check page overflow
      if (currRowY + rowH > pageHeight - 45) {
        doc.addPage();
        currRowY = 20;
        drawMultiTableHeader(currRowY);
        currRowY += headerH;
      }

      const mHissa = Number(m.hissaCount || 1);
      const mSubtotal = mHissa * perCost;

      // Subtle alternating zebra background
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, currRowY, contentWidth, rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.rect(margin, currRowY, contentWidth, rowH, 'S');

      // Col 1: S.No
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), margin + 7, currRowY + 5.5, { align: 'center' });

      // Col 2: Family Member Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const fittedName = fitText(m.memberName, 63);
      doc.text(fittedName, margin + 17, currRowY + 5.5);

      // Col 3: Hissa Count
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 57, 126);
      doc.text(String(mHissa), margin + 82 + 11, currRowY + 5.5, { align: 'center' });

      // Col 4: Per Hissa Cost
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `INR ${perCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        margin + 104 + 30,
        currRowY + 5.5,
        { align: 'right' }
      );

      // Col 5: Member Amount
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(
        `INR ${mSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - margin - 5,
        currRowY + 5.5,
        { align: 'right' }
      );

      currRowY += rowH;
    });

    y = currRowY;
  } else {
    // Single Person standard allocation table
    const tableTopY = y;
    const tableH = 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, tableTopY, contentWidth, tableH, 'F');

    doc.setDrawColor(226, 232, 240);
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

    y = rowY + rowH;
  }

  // 7. Summary Section (Collection Centre & Meat Wanted on left, Financial totals on right)
  let summaryY = y + 10;
  if (summaryY > pageHeight - 45) {
    doc.addPage();
    summaryY = 25;
  }

  // Left column: Collection Centre & Meat Wanted
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Collection Centre:', margin, summaryY);
  const ccLabelW = doc.getTextWidth('Collection Centre: ');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(fitText(collectionCentreName, 72), margin + ccLabelW, summaryY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Meat Wanted:', margin, summaryY + 7);
  const mwLabelW = doc.getTextWidth('Meat Wanted: ');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(meatWanted, margin + mwLabelW, summaryY + 7);

  // Right column: Financial breakdown
  const sumColLabelX = pageWidth - margin - 58;
  const sumColValX = pageWidth - margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Total Hissa:', sumColLabelX, summaryY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(String(hissaCount), sumColValX, summaryY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Per Hissa Cost:', sumColLabelX, summaryY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    `INR ${perCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    sumColValX,
    summaryY + 6.5,
    { align: 'right' }
  );

  doc.setTextColor(22, 57, 126); // Deep Navy Blue highlight for total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total Amount:', sumColLabelX, summaryY + 14);
  doc.text(
    `INR ${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    sumColValX,
    summaryY + 14,
    { align: 'right' }
  );

  // 8. Footer divider & note (pinned near bottom of page)
  let footerY = summaryY + 24;
  if (footerY > pageHeight - 25) {
    footerY = pageHeight - 20;
  } else if (footerY < pageHeight - 32) {
    footerY = Math.max(footerY, pageHeight - 32);
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'This document is an official Qurbani Hissa Booking Receipt. All monetary amounts are in Indian Rupees (INR).',
    pageWidth / 2,
    footerY + 7,
    { align: 'center' }
  );

  return doc;
}

/**
 * Downloads the branded PDF receipt for a given hissa booking.
 * Automatically enriches booking with collection centre and family member details if needed.
 *
 * @param {Object} booking - The booking object
 * @returns {Promise<string>} The filename downloaded
 */
export async function downloadReceipt(booking) {
  if (!booking) {
    throw new Error('No booking specified.');
  }

  let resolvedBooking = { ...booking };

  // If booking is missing members array or collection centre name, attempt to fetch details
  const targetId =
    resolvedBooking.hissaBookingId ||
    resolvedBooking.bookingId ||
    (typeof resolvedBooking.id === 'number'
      ? resolvedBooking.id
      : String(resolvedBooking.id || '').replace(/\D/g, ''));

  const needsDetails =
    (!Array.isArray(resolvedBooking.members) || resolvedBooking.members.length === 0) ||
    (!resolvedBooking.collectionCentreName && !resolvedBooking.collectionCentre?.name);

  if (targetId && needsDetails) {
    try {
      const res = await api.get(`/api/v1/hissa-bookings/${targetId}`);
      if (res?.data?.data) {
        const fetched = res.data.data;
        resolvedBooking = {
          ...fetched,
          ...resolvedBooking,
          members:
            Array.isArray(fetched.members) && fetched.members.length > 0
              ? fetched.members
              : resolvedBooking.members || [],
          collectionCentreName:
            fetched.collectionCentreName ||
            fetched.collectionCentre?.name ||
            resolvedBooking.collectionCentreName ||
            resolvedBooking.collectionCentre?.name,
          collectionCentre: fetched.collectionCentre || resolvedBooking.collectionCentre,
        };
      }
    } catch {
      // Gracefully continue with resolvedBooking as-is
    }
  }

  const cleanReceipt = String(
    resolvedBooking.receiptNumber || `QB-${resolvedBooking.hissaBookingId || resolvedBooking.id}`
  ).replace(/^#/, '');
  const filename = `${cleanReceipt}.pdf`;

  try {
    const doc = generateBrandedReceiptPdf(resolvedBooking);
    doc.save(filename);
    return filename;
  } catch (err) {
    console.error('Failed to generate branded receipt PDF:', err);
    throw new Error(err.message || 'Failed to generate PDF receipt.');
  }
}
