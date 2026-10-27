import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Info,
  Eye,
  Pencil,
  PlusCircle,
  Plus,
  RefreshCw,
  Search,
  ChevronDown,
  Check,
  Calendar,
  Layers,
  X,
} from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import Modal, { ModalActions, Field } from '../components/Modal.jsx';
import { TableScroll, Td, IconButton } from '../components/Table.jsx';
import { formatNumber, formatMoney, formatCompactNumber, formatHissaValue } from '../data/mockData.js';
import { api } from '../services/api.js';
import ProjectDropdown from '../components/ProjectDropdown.jsx';
import { getActiveSeasonYear } from '../utils/season.js';

// Numerical boundaries and character constraints for animals & financial amounts
export const MAX_STOCK_COST = 100000000; // ₹10,00,00,000 (10 Crore max per addition/batch)
export const MAX_STOCK_QTY = 10000; // 10,000 animals max per addition/batch
export const MAX_COST_DIGITS = 9; // up to 9 whole-rupee digits (999,999,999)
export const MAX_QTY_DIGITS = 5; // up to 5 digits (99,999)

// Safe precision calculation helpers for Hissa allocations
export const calculateTotalHissa = (animals) => {
  const str = String(animals || '').trim();
  if (!str) return 0;
  if (/^\d+$/.test(str)) {
    try {
      return BigInt(str) * 7n;
    } catch {}
  }
  const n = Number(str);
  return isNaN(n) ? 0 : n * 7;
};

export const calculateAvailableHissa = (totalHissa, booked) => {
  const bookedCount = Number(booked || 0);
  if (typeof totalHissa === 'bigint') {
    const bookedBi = BigInt(bookedCount);
    const diff = totalHissa - bookedBi;
    return diff > 0n ? diff : 0n;
  }
  const total = Number(totalHissa || 0);
  return Math.max(total - bookedCount, 0);
};

// Helper to determine allowed batch year range (strictly current operating season only)
export const getBatchYearRange = (activeSeasonYear = getActiveSeasonYear()) => {
  const activeYear = Number(activeSeasonYear) || new Date().getFullYear();
  return {
    min: activeYear,
    max: activeYear,
    active: activeYear,
  };
};

// Helper function to extract error message from API response
export function getErrorMessage(err, fallback = 'An unexpected error occurred.') {
  if (!err?.response) {
    return err?.message || fallback;
  }
  const status = err.response.status;
  const resData = err.response.data;

  if (status === 400) {
    // 0. Gracefully translate technical payload serialization / malformed input errors
    if (
      typeof resData?.message === 'string' &&
      /malformed|invalid json|unparseable|deserializ|overflow|out of range|numberformatexception/i.test(resData.message)
    ) {
      return 'Invalid input format or numeric value exceeded acceptable limits. Please check your inputs.';
    }

    // 1. Check if resData.data is an object containing field error messages
    // e.g. { "totalAnimals": "Total animals count must be greater than zero" }
    if (resData?.data && typeof resData.data === 'object' && !Array.isArray(resData.data)) {
      const fieldErrors = Object.entries(resData.data)
        .map(([k, v]) => (typeof v === 'string' ? v : `${k}: ${v}`))
        .filter(Boolean);
      if (fieldErrors.length > 0) {
        if (resData.message && resData.message !== 'Validation failed') {
          return `${resData.message}: ${fieldErrors.join(', ')}`;
        }
        return fieldErrors.join(', ');
      }
    }

    // 2. Check if resData.errors is present (array or object)
    if (resData?.errors) {
      if (Array.isArray(resData.errors)) return resData.errors.join(', ');
      if (typeof resData.errors === 'object') {
        const errList = Object.values(resData.errors).flat().join(', ');
        if (errList) return errList;
      }
    }

    // 3. String data
    if (typeof resData?.data === 'string' && resData.data) {
      return resData.data;
    }

    // 4. Fallback to resData.message or generic validation error
    if (resData?.message) {
      return resData.message;
    }
    return resData?.error || 'Validation error. Please check your inputs.';
  }

  if (status === 404) {
    return resData?.message || resData?.error || 'Animal inventory not found.';
  }

  if (status === 409) {
    return (
      resData?.message ||
      resData?.error ||
      'Duplicate animal inventory for this animal type and batch year already exists.'
    );
  }

  if (status >= 500) {
    const rawMsg = resData?.message || resData?.error || '';
    if (
      typeof rawMsg === 'string' &&
      /overflow|out of range|numberformatexception|conversion|cannot deserialize|numeric/i.test(rawMsg)
    ) {
      return 'A numeric value entered exceeds acceptable limits. Please verify that all input values are within valid limits and try again.';
    }
    if (
      !rawMsg ||
      rawMsg.toLowerCase().includes('internal server error') ||
      rawMsg.toLowerCase().includes('unexpected')
    ) {
      return 'The server could not process the request. Please verify that all input values are within valid limits and try again.';
    }
    return rawMsg;
  }

  return resData?.message || resData?.error || fallback;
}


// Table Component
export function InventoryTable({ items, isLoading, onEdit, onView, onAddStock, onRefresh }) {
  const isEmpty = items.length === 0;
  const headerClassName = `${isEmpty ? 'whitespace-normal' : 'whitespace-nowrap'} pb-3 pr-5 text-[10px] font-bold uppercase tracking-[.13em] text-[#8a948e] dark:text-[#789d8e]`;

  return (
    <TableScroll>
      <table
        className="w-full text-left text-sm"
        style={isEmpty ? { minWidth: 0, tableLayout: 'fixed' } : undefined}
      >
        <thead>
          <tr>
            <th className={headerClassName}>Animal Type</th>
            <th className={headerClassName}>Batch Year</th>
            <th className={headerClassName}>Total Animals</th>
            <th className={headerClassName}>Total Hissa</th>
            <th className={headerClassName}>Booked Hissa</th>
            <th className={headerClassName}>Available Hissa</th>
            <th className={headerClassName}>Batch Cost</th>
            <th className={headerClassName}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="whitespace-normal py-10 pr-5 text-center text-[#78847c] dark:text-[#92b1a3]">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-[#246b59] dark:text-[#4ade80]" />
                  <span>Loading animal batches from server...</span>
                </div>
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={8} className="whitespace-normal py-10 pr-5 text-center text-[#78847c] dark:text-[#92b1a3]">
                <div className="space-y-2">
                  <p className="font-semibold text-[#315246] dark:text-[#e0eee6]">No active batches match your filter</p>
                  <p className="text-xs">Create a new batch or reset your search & dropdown filters.</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const id = item.animalId || item.id;
              const type = item.animalType || item.animal || 'Buffalo';
              const available =
                item.availableHissa !== undefined
                  ? item.availableHissa
                  : (item.totalHissa || 0) - (item.bookedHissa || 0);

              return (
                <tr
                  key={id}
                  data-testid={`row-inventory-${id}`}
                  className="border-t border-[#eee8dc] dark:border-[#193a2f] transition hover:bg-[#faf7f0]/60 dark:hover:bg-[#132c23]"
                >
                  <Td>
                    <span className="inline-flex items-center gap-2 font-semibold text-[#315246] dark:text-[#edf6f2]">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e4efe7] text-[#246b59] dark:bg-[#18382d] dark:text-[#4ade80]">
                        <Box size={14} />
                      </span>
                      {type}
                    </span>
                  </Td>
                  <Td className="font-semibold">{item.batchYear}</Td>
                  <Td title={String(item.totalAnimals)} className="max-w-[120px] truncate">{formatNumber(item.totalAnimals)}</Td>
                  <Td title={String(item.totalHissa)} className="max-w-[120px] truncate font-bold text-[#183f35] dark:text-[#edf6f2]">{formatNumber(item.totalHissa)}</Td>
                  <Td title={String(item.bookedHissa || 0)} className="max-w-[120px] truncate">
                    <span className={item.bookedHissa > 0 ? 'font-semibold text-[#9b6b1e] dark:text-[#f3c46a]' : ''}>
                      {formatNumber(item.bookedHissa || 0)}
                    </span>
                  </Td>
                  <Td title={String(available)} className="max-w-[120px] truncate">
                    <span className={`font-bold ${available > 0 ? 'text-[#246b59] dark:text-[#4ade80]' : 'text-[#a63f32] dark:text-[#fca5a5]'}`}>
                      {formatNumber(available)}
                    </span>
                  </Td>
                  <Td title={formatMoney(item.totalPrice)} className="max-w-[160px] truncate font-mono font-medium">{formatMoney(item.totalPrice)}</Td>
                  <Td>
                    <div className="flex gap-1 items-center">
                      <IconButton label="View inventory" icon={Eye} onClick={() => onView(item)} />
                      <IconButton label="Edit inventory" icon={Pencil} onClick={() => onEdit(item)} />
                      {onAddStock && (
                        <IconButton
                          label="Add stock (+)"
                          icon={PlusCircle}
                          onClick={() => onAddStock(item)}
                          className="text-[#246b59] hover:text-[#183f35] hover:bg-[#e4efe7] dark:text-[#4ade80] dark:hover:bg-[#18382d]"
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </TableScroll>
  );
}

// Add Stock Modal Component (API 12: POST /api/v1/animals/:id/add-stock)
export function AddStockModal({ item, onClose, onSave, onEditBatch, apiError, isSaving }) {
  const [form, setForm] = useState({
    quantity: '',
    price: '',
  });
  const [costError, setCostError] = useState('');
  const [qtyError, setQtyError] = useState('');

  const qty = Number(form.quantity || 0);
  const addPrice = Number(form.price || 0);
  const currentTotal = Number(item?.totalAnimals || 0);
  const currentPrice = Number(item?.totalPrice || 0);
  const currentHissa = Number(item?.totalHissa || currentTotal * 7);

  const additionalHissa = calculateTotalHissa(form.quantity);
  const newTotalAnimals = typeof additionalHissa === 'bigint'
    ? BigInt(currentTotal) + BigInt(form.quantity || 0)
    : currentTotal + qty;
  const newTotalHissa = typeof additionalHissa === 'bigint'
    ? BigInt(currentHissa) + additionalHissa
    : currentHissa + (qty * 7);
  const newTotalPrice = currentPrice + addPrice;

  const newAnimalsFormatted = formatHissaValue(newTotalAnimals);
  const newHissaFormatted = formatHissaValue(newTotalHissa);
  const addQtyFormatted = formatHissaValue(form.quantity);
  const addHissaFormatted = formatHissaValue(additionalHissa);

  const handleQuantityKeyDown = (e) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Only integers: disallow 'e', 'E', '+', '-', '.'
    if (['e', 'E', '+', '-', '.'].includes(e.key) || !/^\d$/.test(e.key)) {
      e.preventDefault();
      setQtyError('Scientific notation, decimals, and signs are not allowed.');
      return;
    }
    const input = e.target;
    const hasSelection =
      input &&
      typeof input.selectionStart === 'number' &&
      typeof input.selectionEnd === 'number' &&
      input.selectionStart !== input.selectionEnd;
    if (!hasSelection && String(form.quantity || '').length >= MAX_QTY_DIGITS) {
      e.preventDefault();
      setQtyError(`Quantity cannot exceed ${formatNumber(MAX_STOCK_QTY)} animals (max ${MAX_QTY_DIGITS} digits).`);
    }
  };

  const handleQuantityPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (/[eE+.\-]/.test(pasted)) {
      e.preventDefault();
      setQtyError('Scientific notation, decimals, and signs are not allowed.');
      return;
    }
    const clean = pasted.replace(/\D/g, '').slice(0, MAX_QTY_DIGITS);
    if (!clean) return;
    e.preventDefault();
    setForm((f) => ({ ...f, quantity: clean }));
    const num = Number(clean);
    if (num > MAX_STOCK_QTY) {
      setQtyError(`Quantity cannot exceed ${formatNumber(MAX_STOCK_QTY)} animals (max ${MAX_QTY_DIGITS} digits).`);
    } else {
      setQtyError('');
    }
  };

  const handleQuantityChange = (e) => {
    if (e.target.validity?.badInput) {
      setQtyError('Please enter a valid whole number of animals.');
      return;
    }

    let val = e.target.value;

    if (val === '') {
      setQtyError('');
      setForm((f) => ({ ...f, quantity: '' }));
      return;
    }

    if (val.includes('.') || val.includes('e') || val.includes('E') || val.includes('+') || val.includes('-')) {
      setQtyError('Scientific notation, decimals, and signs are not allowed.');
      val = val.replace(/\D/g, '');
    }

    if (val.length > MAX_QTY_DIGITS) {
      val = val.slice(0, MAX_QTY_DIGITS);
    }

    const num = Number(val);
    if (isNaN(num) || !Number.isFinite(num) || num < 1) {
      setQtyError('Quantity must be at least 1 animal.');
    } else if (num > MAX_STOCK_QTY) {
      setQtyError(`Quantity cannot exceed ${formatNumber(MAX_STOCK_QTY)} animals (max ${MAX_QTY_DIGITS} digits).`);
    } else {
      setQtyError('');
    }

    setForm((f) => ({ ...f, quantity: val }));
  };

  const handleCostKeyDown = (e) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Currency formatting: disallow scientific notation, plus, and minus
    if (['e', 'E', '+', '-'].includes(e.key) || (!/^\d$/.test(e.key) && e.key !== '.')) {
      e.preventDefault();
      setCostError('Only numbers and a decimal point are allowed.');
      return;
    }
    if (e.key === '.' && String(form.price || '').includes('.')) {
      e.preventDefault();
      setCostError('Only one decimal point is allowed.');
      return;
    }
    // Restrict typing more digits if whole number portion already has max allowed digits
    const input = e.target;
    const hasSelection =
      input &&
      typeof input.selectionStart === 'number' &&
      typeof input.selectionEnd === 'number' &&
      input.selectionStart !== input.selectionEnd;
    if (!hasSelection) {
      const currentVal = String(form.price || '');
      const parts = currentVal.split('.');
      const dotIndex = currentVal.indexOf('.');
      const cursor = input?.selectionStart ?? currentVal.length;
      if (/^\d$/.test(e.key) && (dotIndex === -1 || cursor <= dotIndex) && parts[0].length >= MAX_COST_DIGITS) {
        e.preventDefault();
        setCostError(`Additional cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max ${MAX_COST_DIGITS} digits).`);
      }
    }
  };

  const handleCostPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (/[eE+\-]/.test(pasted)) {
      e.preventDefault();
      setCostError('Scientific notation, signs, and exponential numbers are not allowed.');
      return;
    }
    let cleaned = pasted.replace(/[^\d.]/g, '');
    if (!cleaned) return;
    if (cleaned.includes('.')) {
      const [whole, decimal] = cleaned.split('.');
      cleaned = `${whole.slice(0, MAX_COST_DIGITS)}.${(decimal || '').slice(0, 2)}`;
    } else if (cleaned.length > MAX_COST_DIGITS) {
      cleaned = cleaned.slice(0, MAX_COST_DIGITS);
    }
    e.preventDefault();
    setForm((f) => ({ ...f, price: cleaned }));
    const num = Number(cleaned);
    if (num > MAX_STOCK_COST) {
      setCostError(`Additional cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max ${MAX_COST_DIGITS} digits).`);
    } else {
      setCostError('');
    }
  };

  const handleCostChange = (e) => {
    if (e.target.validity?.badInput) {
      setCostError('Please enter a valid numeric cost without exponential or special characters.');
      return;
    }

    let val = e.target.value;

    if (val === '') {
      setCostError('');
      setForm((f) => ({ ...f, price: '' }));
      return;
    }

    if (val.includes('-')) {
      setCostError('Additional cost must be zero or positive.');
      val = val.replace(/-/g, '');
    }

    if (val.includes('e') || val.includes('E') || val.includes('+')) {
      setCostError('Scientific notation and signs are not allowed.');
      val = val.replace(/[eE+]/g, '');
    }

    // Currency formatting: restrict to at most 2 decimal places
    if (val.includes('.')) {
      const [whole, decimal] = val.split('.');
      val = `${whole.slice(0, MAX_COST_DIGITS)}.${(decimal || '').slice(0, 2)}`;
    } else if (val.length > MAX_COST_DIGITS) {
      val = val.slice(0, MAX_COST_DIGITS);
    }

    const num = Number(val);
    const rawWhole = val.split('.')[0];
    if (isNaN(num) || !Number.isFinite(num)) {
      setCostError('Please enter a valid numeric cost.');
    } else if (num < 0) {
      setCostError('Additional cost must be zero or positive.');
    } else if (num > MAX_STOCK_COST || rawWhole.length > MAX_COST_DIGITS) {
      setCostError(`Additional cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max ${MAX_COST_DIGITS} digits).`);
    } else {
      setCostError('');
    }

    setForm((f) => ({ ...f, price: val }));
  };

  const numQty = Number(form.quantity);
  const numPrice = Number(form.price);
  const qtyStr = String(form.quantity || '').trim();
  const priceStr = String(form.price || '').trim();

  const isQtyValid =
    qtyStr !== '' &&
    !qtyError &&
    !/[eE+.\-]/.test(qtyStr) &&
    !isNaN(numQty) &&
    Number.isFinite(numQty) &&
    Number.isInteger(numQty) &&
    numQty >= 1 &&
    numQty <= MAX_STOCK_QTY &&
    qtyStr.length <= MAX_QTY_DIGITS;

  const isCostValid =
    priceStr !== '' &&
    !costError &&
    !/[eE+\-]/.test(priceStr) &&
    !isNaN(numPrice) &&
    Number.isFinite(numPrice) &&
    numPrice >= 0 &&
    numPrice <= MAX_STOCK_COST &&
    priceStr.split('.')[0].length <= MAX_COST_DIGITS;

  const isFormValid = isQtyValid && isCostValid;

  return (
    <Modal
      title={`Add Stock to ${item.animalType || 'Animal'} Batch #${item.animalId || item.id}`}
      description="Quickly replenish live animal stock and auto-expand available Hissa allocation."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isFormValid) return;
          onSave(form, item);
        }}
      >
        {apiError && (
          <div className="mb-4 rounded-xl border border-[#efb7ae] bg-[#fff3f0] p-3 text-sm text-[#a63f32] dark:border-[#5d2520] dark:bg-[#331614] dark:text-[#fca5a5]">
            {apiError}
          </div>
        )}

        {/* Current status summary banner */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ded7c8] bg-[#faf7f0] p-3.5 text-xs text-[#526359] dark:border-[#21473a] dark:bg-[#122b22] dark:text-[#b4cbbe]">
          <div className="min-w-0">
            <span className="font-bold text-[#183f35] dark:text-[#edf6f2]">{item.animalType || 'Animal'}</span> ({item.batchYear})
          </div>
          <div className="min-w-0 break-words [overflow-wrap:anywhere]">
            Current: <strong className="text-[#183f35] dark:text-[#edf6f2]">{formatNumber(currentTotal)} animals</strong> · {formatMoney(currentPrice)}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Additional Quantity (Animals)">
            <input
              data-testid="input-add-stock-quantity"
              className={`input ${qtyError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              type="number"
              min="1"
              max={MAX_STOCK_QTY}
              maxLength={MAX_QTY_DIGITS}
              value={form.quantity}
              onChange={handleQuantityChange}
              onKeyDown={handleQuantityKeyDown}
              onPaste={handleQuantityPaste}
              placeholder="e.g. 5"
              disabled={isSaving}
              required
              autoFocus
            />
            {qtyError && (
              <p data-testid="error-add-stock-quantity" className="mt-1 text-xs font-medium text-[#a63f32] dark:text-[#fca5a5]">{qtyError}</p>
            )}
          </Field>
          <Field label="Additional Cost (₹ Total)">
            <input
              data-testid="input-add-stock-price"
              className={`input ${costError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              type="number"
              min="0"
              max={MAX_STOCK_COST}
              step="0.01"
              maxLength={12}
              value={form.price}
              onChange={handleCostChange}
              onKeyDown={handleCostKeyDown}
              onPaste={handleCostPaste}
              placeholder="e.g. 250000"
              disabled={isSaving}
              required
            />
            {costError && (
              <p data-testid="error-add-stock-price" className="mt-1 text-xs font-medium text-[#a63f32] dark:text-[#fca5a5]">{costError}</p>
            )}
          </Field>
        </div>

        {/* Real-time calculated projection */}
        <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-[#e4efe7]/50 p-4 sm:grid-cols-3 dark:bg-[#162f27] dark:border dark:border-[#1e493b] overflow-hidden">
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs text-[#526359] dark:text-[#92b1a3]">New Total Animals</p>
            <p
              title={`${newAnimalsFormatted.full} animals`}
              className={`mt-1 font-display font-extrabold leading-tight text-[#183f35] dark:text-[#edf6f2] truncate break-words [overflow-wrap:anywhere] ${newAnimalsFormatted.fontSize}`}
            >
              {newAnimalsFormatted.display}
            </p>
            <p
              title={`(+${addQtyFormatted.full} animals)`}
              className="text-[11px] font-semibold text-[#246b59] dark:text-[#4ade80] truncate break-words [overflow-wrap:anywhere]"
            >
              {qtyError || qty > MAX_STOCK_QTY ? (
                <span>
                  (+{addQtyFormatted.display}) · <span className="text-[#a63f32] dark:text-[#fca5a5]">Exceeds limit</span>
                </span>
              ) : (
                `(+${addQtyFormatted.display} animals)`
              )}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs text-[#526359] dark:text-[#92b1a3]">New Total Hissa</p>
            <p
              title={`${newHissaFormatted.full} hissa`}
              className={`mt-1 font-display font-extrabold leading-tight text-[#246b59] dark:text-[#4ade80] truncate break-words [overflow-wrap:anywhere] ${newHissaFormatted.fontSize}`}
            >
              {newHissaFormatted.display}
            </p>
            <p
              title={`(+${addHissaFormatted.full} hissa)`}
              className="text-[11px] font-semibold text-[#246b59] dark:text-[#4ade80] truncate break-words [overflow-wrap:anywhere]"
            >
              {qtyError || qty > MAX_STOCK_QTY ? (
                <span>
                  (+{addHissaFormatted.display}) · <span className="text-[#a63f32] dark:text-[#fca5a5]">Exceeds limit</span>
                </span>
              ) : (
                `(+${addHissaFormatted.display} hissa)`
              )}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs text-[#526359] dark:text-[#92b1a3]">New Total Batch Value</p>
            <p
              className="mt-1 font-display text-lg sm:text-xl font-extrabold leading-tight text-[#183f35] dark:text-[#edf6f2] truncate break-words [overflow-wrap:anywhere]"
              title={formatMoney(newTotalPrice)}
            >
              {formatMoney(newTotalPrice)}
            </p>
            <p
              className="text-[11px] font-semibold text-[#9b6b1e] dark:text-[#f3c46a] truncate break-words [overflow-wrap:anywhere]"
              title={`+${formatMoney(addPrice)}`}
            >
              {costError || addPrice > MAX_STOCK_COST ? (
                <span>
                  (+{formatMoney(addPrice)}) · <span className="text-[#a63f32] dark:text-[#fca5a5]">Exceeds ₹10 Cr limit</span>
                </span>
              ) : (
                `(+${formatMoney(addPrice)})`
              )}
            </p>
          </div>
        </div>

        {onEditBatch && (
          <button
            type="button"
            onClick={() => onEditBatch(item)}
            disabled={isSaving}
            className="mt-4 text-xs font-bold text-[#246b59] hover:underline disabled:opacity-50 dark:text-[#4ade80]"
          >
            Edit existing batch details instead
          </button>
        )}

        <ModalActions
          onClose={onClose}
          submitLabel={isSaving ? 'Adding Stock...' : `Confirm +${qty || 0} Animals`}
          disabled={isSaving || !isFormValid}
        />
      </form>
    </Modal>
  );
}

// Add/Edit Modal Component
export function InventoryModal({
  item,
  onClose,
  onSave,
  onAddStock,
  duplicateBatch,
  apiError,
  isSaving,
  activeSeasonYear,
  availableAnimalTypes,
}) {
  const { min: minBatchYear, max: maxBatchYear, active: activeYear } = getBatchYearRange(
    activeSeasonYear || getActiveSeasonYear()
  );

  const availableTypes = useMemo(() => {
    const fromProps = Array.isArray(availableAnimalTypes)
      ? availableAnimalTypes.map((t) => String(t || '').trim()).filter(Boolean)
      : [];
    const baseList = fromProps.length > 0 ? fromProps : ['Buffalo'];
    const current = (item?.animalType || item?.animal || '').trim();
    if (current && !baseList.some((t) => t.toLowerCase() === current.toLowerCase())) {
      return [...baseList, current];
    }
    return baseList;
  }, [availableAnimalTypes, item]);

  const hasMultipleTypes = availableTypes.length > 1;

  const [form, setForm] = useState({
    batchYear: item?.batchYear ?? activeYear,
    totalAnimals: item?.totalAnimals ?? '',
    totalPrice: item?.totalPrice ?? '',
    animalType: item?.animalType || item?.animal || availableTypes[0] || 'Buffalo',
  });
  const [qtyError, setQtyError] = useState(() => {
    if (item?.totalAnimals !== undefined && item?.totalAnimals !== null && item?.totalAnimals !== '') {
      const num = Number(item.totalAnimals);
      if (isNaN(num) || num < 1) return 'Total animals must be at least 1.';
      if (num > MAX_STOCK_QTY) return `Total animals cannot exceed ${formatNumber(MAX_STOCK_QTY)}.`;
    }
    return '';
  });
  const [costError, setCostError] = useState(() => {
    if (item?.totalPrice !== undefined && item?.totalPrice !== null && item?.totalPrice !== '') {
      const num = Number(item.totalPrice);
      if (isNaN(num) || num < 0) return 'Batch purchase cost must be zero or a positive amount.';
      if (num > MAX_STOCK_COST || String(item.totalPrice).split('.')[0].length > MAX_COST_DIGITS) {
        return `Batch purchase cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max 9 digits).`;
      }
    }
    return '';
  });

  const validateBatchYear = (val) => {
    const str = String(val ?? '').trim();
    if (!str) return 'Batch year is required.';
    if (/[eE+.\-]/.test(str)) return 'Batch year must be a 4-digit whole year.';
    if (str.length !== 4) return 'Batch year must be a 4-digit year.';
    const y = Number(str);
    if (isNaN(y) || !Number.isInteger(y)) return 'Batch year must be a valid whole year.';

    // Allow existing historical batch if its year was not modified and not in future
    if (item && item.batchYear !== undefined && y === Number(item.batchYear) && y <= activeYear) {
      return '';
    }

    if (y !== activeYear) {
      if (y > activeYear) {
        return `Batch year cannot be in the future (${y}). Animal batch creation is restricted to the current active season (${activeYear}) only.`;
      }
      return `Batch year must match the current operating season (${activeYear}).`;
    }
    return '';
  };

  const [yearError, setYearError] = useState(() => {
    const yr = item?.batchYear ?? activeYear;
    return validateBatchYear(yr);
  });

  useEffect(() => {
    if (item) {
      setForm({
        batchYear: item?.batchYear ?? activeYear,
        totalAnimals: item?.totalAnimals ?? '',
        totalPrice: item?.totalPrice ?? '',
        animalType: item?.animalType || item?.animal || availableTypes[0] || 'Buffalo',
      });

      setYearError(validateBatchYear(item?.batchYear ?? activeYear));

      const numAnimals = Number(item?.totalAnimals);
      if (item?.totalAnimals !== undefined && item?.totalAnimals !== '' && (isNaN(numAnimals) || numAnimals < 1)) {
        setQtyError('Total animals must be at least 1.');
      } else if (numAnimals > MAX_STOCK_QTY) {
        setQtyError(`Total animals cannot exceed ${formatNumber(MAX_STOCK_QTY)} (max 5 digits).`);
      } else {
        setQtyError('');
      }

      const numPrice = Number(item?.totalPrice);
      if (item?.totalPrice !== undefined && item?.totalPrice !== '' && (isNaN(numPrice) || numPrice < 0)) {
        setCostError('Batch purchase cost must be zero or a positive amount.');
      } else if (numPrice > MAX_STOCK_COST || String(item?.totalPrice || '').split('.')[0].length > MAX_COST_DIGITS) {
        setCostError(`Batch purchase cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max 9 digits).`);
      } else {
        setCostError('');
      }
    } else {
      setForm((prev) => ({
        ...prev,
        animalType: prev.animalType || availableTypes[0] || 'Buffalo',
      }));
    }
  }, [item, activeYear, minBatchYear, maxBatchYear, availableTypes]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const computedTotalHissa = calculateTotalHissa(form.totalAnimals);
  const bookedCount = item?.bookedHissa || 0;
  const computedAvailableHissa = calculateAvailableHissa(computedTotalHissa, bookedCount);

  const totalHissaFormatted = formatHissaValue(computedTotalHissa);
  const availableHissaFormatted = formatHissaValue(computedAvailableHissa);
  const animalCountFormatted = formatHissaValue(form.totalAnimals);

  const handleYearKeyDown = (e) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (['e', 'E', '+', '-', '.'].includes(e.key) || !/^\d$/.test(e.key)) {
      e.preventDefault();
      setYearError('Scientific notation, decimals, and signs are not allowed.');
      return;
    }
    const input = e.target;
    const hasSelection =
      input &&
      typeof input.selectionStart === 'number' &&
      typeof input.selectionEnd === 'number' &&
      input.selectionStart !== input.selectionEnd;
    if (!hasSelection && String(form.batchYear || '').length >= 4) {
      e.preventDefault();
      setYearError(`Batch year must match the current operating season (${activeYear}).`);
    }
  };

  const handleYearPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (/[eE+.\-]/.test(pasted)) {
      e.preventDefault();
      setYearError('Batch year must be a 4-digit whole year.');
      return;
    }
    const clean = pasted.replace(/\D/g, '').slice(0, 4);
    if (!clean) return;
    e.preventDefault();
    set('batchYear', clean);
    setYearError(validateBatchYear(clean));
  };

  const handleYearChange = (e) => {
    let val = e.target.value;

    if (val === '') {
      setYearError('Batch year is required.');
      set('batchYear', '');
      return;
    }

    if (val.includes('.') || val.includes('e') || val.includes('E') || val.includes('+') || val.includes('-')) {
      setYearError('Batch year must be a 4-digit whole year.');
      val = val.replace(/[eE+\-\.]/g, '');
    }

    if (val.length > 4) {
      val = val.slice(0, 4);
    }

    setYearError(validateBatchYear(val));
    set('batchYear', val);
  };

  const handleYearBlur = () => {
    const val = String(form.batchYear || '').trim();
    setYearError(validateBatchYear(val));
  };

  const handleQuantityKeyDown = (e) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (['e', 'E', '+', '-', '.'].includes(e.key) || !/^\d$/.test(e.key)) {
      e.preventDefault();
      setQtyError('Scientific notation, decimals, and signs are not allowed.');
      return;
    }
    const input = e.target;
    const hasSelection =
      input &&
      typeof input.selectionStart === 'number' &&
      typeof input.selectionEnd === 'number' &&
      input.selectionStart !== input.selectionEnd;
    if (!hasSelection && String(form.totalAnimals || '').length >= MAX_QTY_DIGITS) {
      e.preventDefault();
      setQtyError(`Total animals cannot exceed ${formatNumber(MAX_STOCK_QTY)} (max ${MAX_QTY_DIGITS} digits).`);
    }
  };

  const handleQuantityPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (/[eE+.\-]/.test(pasted)) {
      e.preventDefault();
      setQtyError('Scientific notation, decimals, and signs are not allowed.');
      return;
    }
    const clean = pasted.replace(/\D/g, '').slice(0, MAX_QTY_DIGITS);
    if (!clean) return;
    e.preventDefault();
    set('totalAnimals', clean);
    const num = Number(clean);
    if (num > MAX_STOCK_QTY) {
      setQtyError(`Total animals cannot exceed ${formatNumber(MAX_STOCK_QTY)} (max ${MAX_QTY_DIGITS} digits).`);
    } else {
      setQtyError('');
    }
  };

  const handleQuantityChange = (e) => {
    if (e.target.validity?.badInput) {
      setQtyError('Please enter a valid whole number of animals.');
      return;
    }

    let val = e.target.value;

    if (val === '') {
      setQtyError('');
      set('totalAnimals', '');
      return;
    }

    if (val.includes('.') || val.includes('e') || val.includes('E') || val.includes('+') || val.includes('-')) {
      setQtyError('Scientific notation, decimals, and signs are not allowed.');
      val = val.replace(/\D/g, '');
    }

    if (val.length > MAX_QTY_DIGITS) {
      val = val.slice(0, MAX_QTY_DIGITS);
    }

    const num = Number(val);
    if (isNaN(num) || !Number.isFinite(num) || num < 1) {
      setQtyError('Total animals must be at least 1.');
    } else if (num > MAX_STOCK_QTY) {
      setQtyError(`Total animals cannot exceed ${formatNumber(MAX_STOCK_QTY)} (max ${MAX_QTY_DIGITS} digits).`);
    } else {
      setQtyError('');
    }

    set('totalAnimals', val);
  };

  const handleCostKeyDown = (e) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (['e', 'E', '+', '-'].includes(e.key) || (!/^\d$/.test(e.key) && e.key !== '.')) {
      e.preventDefault();
      setCostError('Only numbers and a decimal point are allowed.');
      return;
    }
    if (e.key === '.' && String(form.totalPrice || '').includes('.')) {
      e.preventDefault();
      setCostError('Only one decimal point is allowed.');
      return;
    }
    // Restrict typing more digits if whole number portion already has max allowed digits
    const input = e.target;
    const hasSelection =
      input &&
      typeof input.selectionStart === 'number' &&
      typeof input.selectionEnd === 'number' &&
      input.selectionStart !== input.selectionEnd;
    if (!hasSelection) {
      const currentVal = String(form.totalPrice || '');
      const parts = currentVal.split('.');
      const dotIndex = currentVal.indexOf('.');
      const cursor = input?.selectionStart ?? currentVal.length;
      if (/^\d$/.test(e.key) && (dotIndex === -1 || cursor <= dotIndex) && parts[0].length >= MAX_COST_DIGITS) {
        e.preventDefault();
        setCostError(`Batch purchase cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max ${MAX_COST_DIGITS} digits).`);
      }
    }
  };

  const handleCostPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (/[eE+\-]/.test(pasted)) {
      e.preventDefault();
      setCostError('Scientific notation, signs, and exponential numbers are not allowed.');
      return;
    }
    let cleaned = pasted.replace(/[^\d.]/g, '');
    if (!cleaned) return;
    if (cleaned.includes('.')) {
      const [whole, decimal] = cleaned.split('.');
      cleaned = `${whole.slice(0, MAX_COST_DIGITS)}.${(decimal || '').slice(0, 2)}`;
    } else if (cleaned.length > MAX_COST_DIGITS) {
      cleaned = cleaned.slice(0, MAX_COST_DIGITS);
    }
    e.preventDefault();
    set('totalPrice', cleaned);
    const num = Number(cleaned);
    if (num > MAX_STOCK_COST) {
      setCostError(`Batch purchase cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max ${MAX_COST_DIGITS} digits).`);
    } else {
      setCostError('');
    }
  };

  const handleCostChange = (e) => {
    if (e.target.validity?.badInput) {
      setCostError('Please enter a valid numeric cost without exponential or special characters.');
      return;
    }

    let val = e.target.value;

    if (val === '') {
      setCostError('');
      set('totalPrice', '');
      return;
    }

    if (val.includes('-')) {
      setCostError('Batch purchase cost must be zero or a positive amount.');
      val = val.replace(/-/g, '');
    }

    if (val.includes('e') || val.includes('E') || val.includes('+')) {
      setCostError('Scientific notation and signs are not allowed.');
      val = val.replace(/[eE+]/g, '');
    }

    // Currency formatting: restrict to at most 2 decimal places
    if (val.includes('.')) {
      const [whole, decimal] = val.split('.');
      val = `${whole.slice(0, MAX_COST_DIGITS)}.${(decimal || '').slice(0, 2)}`;
    } else if (val.length > MAX_COST_DIGITS) {
      val = val.slice(0, MAX_COST_DIGITS);
    }

    const num = Number(val);
    const rawWhole = val.split('.')[0];
    if (isNaN(num) || !Number.isFinite(num)) {
      setCostError('Please enter a valid numeric cost.');
    } else if (num < 0) {
      setCostError('Batch purchase cost must be zero or a positive amount.');
    } else if (num > MAX_STOCK_COST || rawWhole.length > MAX_COST_DIGITS) {
      setCostError(`Batch purchase cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max ${MAX_COST_DIGITS} digits).`);
    } else {
      setCostError('');
    }

    set('totalPrice', val);
  };

  const numYear = Number(form.batchYear);
  const numAnimals = Number(form.totalAnimals);
  const numPrice = Number(form.totalPrice);
  const yearStr = String(form.batchYear || '').trim();
  const animalsStr = String(form.totalAnimals || '').trim();
  const priceStr = String(form.totalPrice || '').trim();

  const isYearValid =
    yearStr !== '' &&
    !yearError &&
    !isNaN(numYear) &&
    Number.isInteger(numYear) &&
    yearStr.length === 4 &&
    validateBatchYear(numYear) === '';

  const isQtyValid =
    animalsStr !== '' &&
    !qtyError &&
    !/[eE+.\-]/.test(animalsStr) &&
    !isNaN(numAnimals) &&
    Number.isFinite(numAnimals) &&
    Number.isInteger(numAnimals) &&
    numAnimals >= 1 &&
    numAnimals <= MAX_STOCK_QTY &&
    animalsStr.length <= MAX_QTY_DIGITS;

  const isCostValid =
    priceStr !== '' &&
    !costError &&
    !/[eE+\-]/.test(priceStr) &&
    !isNaN(numPrice) &&
    Number.isFinite(numPrice) &&
    numPrice >= 0 &&
    numPrice <= MAX_STOCK_COST &&
    priceStr.split('.')[0].length <= MAX_COST_DIGITS;

  const isCapacityValid =
    typeof computedTotalHissa === 'bigint'
      ? computedTotalHissa >= BigInt(bookedCount)
      : computedTotalHissa >= bookedCount;

  const isFormValid =
    isYearValid &&
    isQtyValid &&
    isCostValid &&
    !(bookedCount > 0 && !isCapacityValid);

  return (
    <Modal
      title={item ? `Edit ${item.animalType || 'Animal'} batch` : 'Add Animal batch'}
      description="Keep the physical batch record and its Hissa math aligned (7 Hissa per animal)."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isFormValid) return;
          onSave(form, item);
        }}
      >
        {apiError && (
          <div className="mb-4 rounded-xl border border-[#efb7ae] bg-[#fff3f0] p-3 text-sm text-[#a63f32] dark:border-[#5d2520] dark:bg-[#331614] dark:text-[#fca5a5]">
            <p>{apiError}</p>
            {duplicateBatch && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="button-duplicate-add-stock"
                  onClick={() => onAddStock(duplicateBatch)}
                  className="btn-primary flex items-center gap-1.5 text-xs"
                >
                  <PlusCircle size={14} />
                  Add Stock to Existing Batch
                </button>
              </div>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Animal Type">
            {hasMultipleTypes ? (
              <select
                data-testid="input-animal-type"
                className="input cursor-pointer"
                value={form.animalType}
                onChange={(e) => set('animalType', e.target.value)}
                disabled={isSaving}
                required
              >
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            ) : (
              <input
                data-testid="input-animal-type"
                type="text"
                readOnly
                value={form.animalType || availableTypes[0] || 'Buffalo'}
                className="input bg-[#faf7f0] text-[#183f35] font-medium border-[#ded7c8] cursor-default focus:border-[#ded7c8] focus:ring-0 select-none dark:bg-[#122b22] dark:text-[#edf6f2] dark:border-[#21473a] dark:focus:border-[#21473a]"
                title="Only 1 animal type is registered in the system"
                disabled={isSaving}
                aria-readonly="true"
              />
            )}
          </Field>
          <Field label="Batch Year">
            <input
              data-testid="input-batch-year"
              className={`input ${yearError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              type="number"
              min={activeYear}
              max={activeYear}
              maxLength={4}
              value={form.batchYear}
              onChange={handleYearChange}
              onKeyDown={handleYearKeyDown}
              onPaste={handleYearPaste}
              onBlur={handleYearBlur}
              placeholder={`e.g. ${activeYear}`}
              disabled={isSaving}
              required
            />
            {yearError ? (
              <p data-testid="error-batch-year" className="mt-1 text-xs font-medium text-[#a63f32] dark:text-[#fca5a5]">{yearError}</p>
            ) : (
              <p className="mt-1 text-[11px] text-[#7b867e] dark:text-[#92b1a3]">
                Batches are restricted to the current active season ({activeYear}) only.
              </p>
            )}
          </Field>
          <Field label="Total Animals">
            <input
              data-testid="input-total-animals"
              className={`input ${qtyError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              type="number"
              min="1"
              max={MAX_STOCK_QTY}
              maxLength={MAX_QTY_DIGITS}
              value={form.totalAnimals}
              onChange={handleQuantityChange}
              onKeyDown={handleQuantityKeyDown}
              onPaste={handleQuantityPaste}
              disabled={isSaving}
              placeholder="e.g. 10"
              required
            />
            {qtyError && (
              <p data-testid="error-total-animals" className="mt-1 text-xs font-medium text-[#a63f32] dark:text-[#fca5a5]">{qtyError}</p>
            )}
          </Field>
          <Field label="Batch Purchase Cost (₹)">
            <input
              data-testid="input-total-price"
              className={`input ${costError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              type="number"
              min="0"
              max={MAX_STOCK_COST}
              step="0.01"
              maxLength={12}
              value={form.totalPrice}
              onChange={handleCostChange}
              onKeyDown={handleCostKeyDown}
              onPaste={handleCostPaste}
              disabled={isSaving}
              placeholder="e.g. 350000"
              required
            />
            {costError && (
              <p data-testid="error-total-price" className="mt-1 text-xs font-medium text-[#a63f32] dark:text-[#fca5a5]">{costError}</p>
            )}
          </Field>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-[#f5f0e5] p-4 sm:grid-cols-2 dark:bg-[#162f27] dark:border dark:border-[#1e493b] overflow-hidden">
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">Auto-calculated Total Hissa</p>
            <p
              title={`${totalHissaFormatted.full} Hissa`}
              className={`mt-1 font-display font-extrabold text-[#183f35] dark:text-[#edf6f2] truncate break-words [overflow-wrap:anywhere] ${totalHissaFormatted.fontSize}`}
            >
              {totalHissaFormatted.display}
            </p>
            <p
              title={`(${animalCountFormatted.full} animals × 7)`}
              className="text-[11px] text-[#8a948e] dark:text-[#789d8e] truncate break-words [overflow-wrap:anywhere]"
            >
              {qtyError || Number(form.totalAnimals) > MAX_STOCK_QTY ? (
                <span>
                  ({animalCountFormatted.display} animals × 7) ·{' '}
                  <span className="font-semibold text-[#a63f32] dark:text-[#fca5a5]">Exceeds limit</span>
                </span>
              ) : (
                `(${animalCountFormatted.display} animals × 7)`
              )}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">Available Hissa after bookings</p>
            <p
              title={`${availableHissaFormatted.full} Hissa`}
              className={`mt-1 font-display font-extrabold text-[#246b59] dark:text-[#4ade80] truncate break-words [overflow-wrap:anywhere] ${availableHissaFormatted.fontSize}`}
            >
              {availableHissaFormatted.display}
            </p>
            {bookedCount > 0 && (
              <p className="text-[11px] text-[#9b6b1e] dark:text-[#f3c46a] truncate break-words [overflow-wrap:anywhere]">
                ({formatNumber(bookedCount)} hissa already booked)
              </p>
            )}
          </div>
        </div>

        {bookedCount > 0 && (typeof computedTotalHissa === 'bigint' ? computedTotalHissa < BigInt(bookedCount) : computedTotalHissa < bookedCount) && (
          <div className="mt-3 rounded-xl border border-[#efb7ae] bg-[#fff3f0] p-3 text-xs font-semibold text-[#a63f32] dark:border-[#5d2520] dark:bg-[#331614] dark:text-[#fca5a5]">
            ⚠️ Capacity protection: Cannot reduce total hissa ({totalHissaFormatted.display}) below {formatNumber(bookedCount)} booked hissa. Minimum {Math.ceil(bookedCount / 7)} animals required.
          </div>
        )}

        <ModalActions
          onClose={onClose}
          submitLabel={isSaving ? 'Saving...' : item ? 'Save changes' : `Add ${form.animalType || 'Animal'} batch`}
          disabled={isSaving || !isFormValid}
        />
      </form>
    </Modal>
  );
}

// View Modal Component - Fetches details via GET /api/v1/animals/:id
export function InventoryView({ item: initialItem, animalId, onClose, onAddStock, notify }) {
  const targetId = animalId || initialItem?.animalId || initialItem?.id;
  const [item, setItem] = useState(initialItem || null);
  const [isLoading, setIsLoading] = useState(!initialItem);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAnimalDetails = async () => {
      if (!targetId) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get(`/api/v1/animals/${targetId}`);
        const data = response.data?.data || response.data;
        if (isMounted && data) {
          setItem(data);
        }
      } catch (err) {
        if (isMounted) {
          const errMsg = getErrorMessage(err, 'Failed to fetch animal details.');
          setError(errMsg);
          if (notify) notify(errMsg, 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAnimalDetails();
    return () => {
      isMounted = false;
    };
  }, [targetId, notify]);

  const displayItem = item || initialItem;

  const fields = displayItem
    ? [
        ['Animal ID', `#${displayItem.animalId || displayItem.id}`],
        ['Animal Type', displayItem.animalType || displayItem.animal || 'Buffalo'],
        ['Batch Year', displayItem.batchYear],
        ['Total Animals', formatNumber(displayItem.totalAnimals)],
        ['Total Hissa', formatNumber(displayItem.totalHissa)],
        ['Booked Hissa', formatNumber(displayItem.bookedHissa || 0)],
        [
          'Available Hissa',
          formatNumber(
            displayItem.availableHissa !== undefined
              ? displayItem.availableHissa
              : (displayItem.totalHissa || 0) - (displayItem.bookedHissa || 0)
          ),
        ],
        ['Batch Purchase Cost', formatMoney(displayItem.totalPrice)],
      ]
    : [];

  return (
    <Modal
      title={`${displayItem?.animalType || 'Animal'} Batch #${displayItem?.animalId || displayItem?.id || targetId}`}
      description="Detailed batch configuration and Hissa status"
      onClose={onClose}
    >
      {isLoading ? (
        <div className="py-8 text-center text-sm text-[#78847c] dark:text-[#92b1a3]">
          <RefreshCw size={18} className="mx-auto mb-2 animate-spin text-[#246b59]" />
          Loading animal details...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[#efb7ae] bg-[#fff3f0] p-4 text-center text-sm text-[#a63f32] dark:border-[#5d2520] dark:bg-[#331614] dark:text-[#fca5a5]">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([label, value]) => (
            <div key={label} className="soft-inset rounded-xl p-4 min-w-0 overflow-hidden">
              <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">{label}</p>
              <p className="mt-1 font-bold text-[#315246] dark:text-[#edf6f2] break-words [overflow-wrap:anywhere]">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-[#eee8dc] pt-4 dark:border-[#1a3d31]">
        <button
          type="button"
          data-testid="button-modal-close"
          onClick={onClose}
          className="btn-secondary text-xs"
        >
          Close
        </button>
        {onAddStock && displayItem && (
          <button
            type="button"
            data-testid="button-view-modal-add-stock"
            onClick={() => onAddStock(displayItem)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <PlusCircle size={14} />
            <span>Add Stock </span>
          </button>
        )}
      </div>
    </Modal>
  );
}

// Main Animal Inventory Page Component
export default function AnimalInventory({ data, patchData, notify }) {
  const [modal, setModal] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [duplicateBatch, setDuplicateBatch] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [searchQuery, setSearchQuery] = useState('');

  const currentYear = getActiveSeasonYear(data);
  const [knownYears, setKnownYears] = useState([currentYear]);
  const [knownAnimalTypes, setKnownAnimalTypes] = useState([]);

  // Fetch all animals from GET /api/v1/animals with optional backend query parameters
  const loadAnimals = async (filterOverrides = {}) => {
    try {
      setIsLoading(true);
      const activeType = filterOverrides.typeFilter !== undefined ? filterOverrides.typeFilter : typeFilter;
      const activeYear = filterOverrides.yearFilter !== undefined ? filterOverrides.yearFilter : yearFilter;

      const params = {};
      if (activeType && activeType !== 'All Types') {
        params.animalType = activeType;
      }
      if (activeYear && activeYear !== 'All Years') {
        params.batchYear = Number(activeYear);
      }

      const response = await api.get('/api/v1/animals', { params });
      const rawAnimalData = response.data?.data;
      const animalsList = Array.isArray(rawAnimalData)
        ? rawAnimalData
        : Array.isArray(rawAnimalData?.content)
        ? rawAnimalData.content
        : Array.isArray(response.data)
        ? response.data
        : [];

      setInventory(animalsList);

      // Accumulate known years so dropdown options never shrink when filtering
      if (animalsList.length > 0) {
        setKnownYears((prev) =>
          Array.from(new Set([...prev, ...animalsList.map((x) => Number(x.batchYear)).filter(Boolean)])).sort((a, b) => b - a)
        );
      }

      // Track known animal types so dropdown options don't shrink or hide unexpectedly while filtering
      const loadedTypes = Array.from(
        new Map(
          animalsList
            .map((x) => (x.animalType || x.animal || '').trim())
            .filter(Boolean)
            .map((t) => [t.toLowerCase(), t])
        ).values()
      );

      if ((!activeType || activeType === 'All Types') && (!activeYear || activeYear === 'All Years')) {
        setKnownAnimalTypes(loadedTypes);
      } else if (loadedTypes.length > 0) {
        setKnownAnimalTypes((prev) => {
          const map = new Map(prev.map((t) => [t.toLowerCase(), t]));
          loadedTypes.forEach((t) => {
            if (!map.has(t.toLowerCase())) {
              map.set(t.toLowerCase(), t);
            }
          });
          return Array.from(map.values());
        });
      }

      if (patchData) {
        patchData((current) => ({
          ...current,
          inventory: animalsList,
        }));
      }
    } catch (err) {
      const errMsg = getErrorMessage(err, 'Failed to load animals from server.');
      notify?.(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, []);

  // Filter logic (combines server response with real-time text search and client safety)
  const filtered = inventory.filter((item) => {
    const itemType = item.animalType || item.animal || 'Buffalo';
    const matchesType =
      typeFilter === 'All Types' || itemType.toLowerCase() === typeFilter.toLowerCase();
    const matchesYear =
      yearFilter === 'All Years' || String(item.batchYear) === String(yearFilter);
    const id = String(item.animalId || item.id);
    const cleanQuery = searchQuery.trim().replace(/^#/, '').toLowerCase();
    const matchesSearch =
      !cleanQuery ||
      id.includes(cleanQuery) ||
      itemType.toLowerCase().includes(cleanQuery) ||
      String(item.batchYear).includes(cleanQuery);

    return matchesType && matchesYear && matchesSearch;
  });

  // Extract distinct options for Custom Dropdowns
  const distinctAnimalTypes = Array.from(
    new Map(
      [...knownAnimalTypes, ...inventory.map((x) => (x.animalType || x.animal || '').trim())]
        .filter(Boolean)
        .map((type) => [type.toLowerCase(), type])
    ).values()
  );
  const hasMultipleTypes = distinctAnimalTypes.length > 1;
  const typeOptions = ['All Types', ...distinctAnimalTypes];

  useEffect(() => {
    if (!hasMultipleTypes && typeFilter !== 'All Types') {
      setTypeFilter('All Types');
    }
  }, [hasMultipleTypes, typeFilter]);

  const allDistinctYears = Array.from(new Set([...knownYears, ...inventory.map((x) => Number(x.batchYear)).filter(Boolean)])).sort((a, b) => b - a);
  const yearOptions = ['All Years', ...allDistinctYears.map(String)];

  // Total available hissa calculation
  const totalAvailableHissa = filtered.reduce(
    (sum, x) =>
      sum +
      (x.availableHissa !== undefined
        ? x.availableHissa
        : (x.totalHissa || 0) - (x.bookedHissa || 0)),
    0
  );

  // Handle Save (Create / Update)
  const save = async (form, existing) => {
    setApiError(null);
    setDuplicateBatch(null);
    setIsSaving(true);

    // Validate Batch Year
    const yearStr = String(form.batchYear || '').trim();
    if (/[eE+.-]/.test(yearStr)) {
      setIsSaving(false);
      const errText = 'Batch year must be a 4-digit whole year.';
      setApiError(errText);
      return notify?.(errText, 'error');
    }
    const year = Number(yearStr);
    const isExistingHistorical =
      existing &&
      existing.batchYear !== undefined &&
      year === Number(existing.batchYear) &&
      year <= currentYear;

    if (!year || isNaN(year) || yearStr.length !== 4 || (!isExistingHistorical && year !== currentYear)) {
      setIsSaving(false);
      const errText =
        year > currentYear
          ? `Batch year cannot be in the future (${year}). Animal batch creation is restricted to the current active season (${currentYear}) only.`
          : `Batch year must match the current operating season (${currentYear}).`;
      setApiError(errText);
      return notify?.(errText, 'error');
    }

    // Validate Total Animals
    const animalsStr = String(form.totalAnimals || '').trim();
    if (/[eE+.-]/.test(animalsStr)) {
      setIsSaving(false);
      const errText = 'Total animals must be a whole positive integer without exponents or decimals';
      setApiError(errText);
      return notify?.(errText, 'error');
    }
    const animals = Number(animalsStr);
    if (!animals || isNaN(animals) || animals < 1) {
      setIsSaving(false);
      const errText = 'Total animals count must be greater than zero';
      setApiError(errText);
      return notify?.(errText, 'error');
    }
    if (animals > MAX_STOCK_QTY || animalsStr.length > MAX_QTY_DIGITS) {
      setIsSaving(false);
      const errText = `Total animals cannot exceed ${formatNumber(MAX_STOCK_QTY)} (max 5 digits)`;
      setApiError(errText);
      return notify?.(errText, 'error');
    }

    // Validate Batch Purchase Cost
    const priceStr = String(form.totalPrice || '').trim();
    if (/[eE+\-]/.test(priceStr)) {
      setIsSaving(false);
      const errText = 'Scientific notation and negative amounts are not allowed for cost. Please enter a standard numeric amount.';
      setApiError(errText);
      return notify?.(errText, 'error');
    }
    const price = Number(priceStr);
    if (isNaN(price) || !Number.isFinite(price) || price < 0) {
      setIsSaving(false);
      const errText = 'Total price must be zero or a positive amount';
      setApiError(errText);
      return notify?.(errText, 'error');
    }
    if (price > MAX_STOCK_COST || priceStr.split('.')[0].length > MAX_COST_DIGITS) {
      setIsSaving(false);
      const errText = `Total price cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max 9 digits)`;
      setApiError(errText);
      return notify?.(errText, 'error');
    }

    const cleanedType = (form.animalType || 'Buffalo').trim();
    if (!cleanedType) {
      setIsSaving(false);
      const errText = 'Animal type is required';
      setApiError(errText);
      return notify?.(errText, 'error');
    }

    if (existing && existing.bookedHissa > 0) {
      const newTotalHissa = animals * 7;
      if (newTotalHissa < existing.bookedHissa) {
        setIsSaving(false);
        const minReq = Math.ceil(existing.bookedHissa / 7);
        const errText = `Cannot reduce total hissa (${newTotalHissa}) below booked count (${existing.bookedHissa}). Requires at least ${minReq} animals.`;
        setApiError(errText);
        return notify?.(errText, 'error');
      }
    }

    try {
      if (existing) {
        // Update animal via PATCH /api/v1/animals/:id
        const id = existing.animalId || existing.id;
        const patchPayload = {};
        const newBatchYear = Number(form.batchYear);

        if (existing.batchYear === undefined || newBatchYear !== Number(existing.batchYear)) {
          patchPayload.batchYear = newBatchYear;
        }
        if (existing.totalAnimals === undefined || animals !== Number(existing.totalAnimals)) {
          patchPayload.totalAnimals = animals;
        }
        if (existing.totalPrice === undefined || price !== Number(existing.totalPrice)) {
          patchPayload.totalPrice = price;
        }

        const existingType = (existing.animalType || existing.animal || '').trim();
        if (cleanedType.toLowerCase() !== existingType.toLowerCase()) {
          patchPayload.animalType = cleanedType;
        }

        if (Object.keys(patchPayload).length === 0) {
          notify?.('No changes detected.');
          setModal(null);
          setIsSaving(false);
          return;
        }

        await api.patch(`/api/v1/animals/${id}`, patchPayload);
        notify?.(`${cleanedType} batch updated successfully.`);
      } else {
        // Create animal via POST /api/v1/animals
        const createPayload = {
          batchYear: Number(form.batchYear),
          totalAnimals: animals,
          animalType: cleanedType,
          totalPrice: price,
        };
        await api.post('/api/v1/animals', createPayload);
        notify?.(`${createPayload.animalType} batch added successfully.`);
      }

      // Close modal and refresh list from backend
      setModal(null);
      await loadAnimals({ typeFilter, yearFilter });
    } catch (err) {
      const errorMsg = getErrorMessage(
        err,
        existing ? 'Failed to update animal batch.' : 'Failed to add animal batch.'
      );
      setApiError(errorMsg);
      const isDuplicate =
        !existing &&
        (err.response?.status === 409 ||
          /already exists|duplicate/i.test(errorMsg));
      if (isDuplicate) {
        try {
          const response = await api.get('/api/v1/animals', {
            params: { animalType: cleanedType, batchYear: Number(form.batchYear) },
          });
          const rawData = response.data?.data;
          const matches = Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData?.content)
            ? rawData.content
            : Array.isArray(response.data)
            ? response.data
            : [];
          const matchingBatch = matches.find(
            (animal) =>
              String(animal.animalType || animal.animal || '').trim().toLowerCase() ===
                cleanedType.toLowerCase() &&
              Number(animal.batchYear) === Number(form.batchYear)
          );
          if (matchingBatch) {
            setDuplicateBatch(matchingBatch);
          } else {
            console.warn('Duplicate batch exists but could not be found in the filtered inventory response.');
          }
        } catch (lookupError) {
          console.error('Failed to find the existing duplicate animal batch:', lookupError);
          notify?.('Could not load the existing batch. Refresh inventory and try again.', 'error');
        }
      }
      notify?.(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Add Animal Stock (API 12: POST /api/v1/animals/:id/add-stock)
  const handleAddStock = async (payload, item) => {
    setIsSaving(true);
    setApiError(null);
    const targetId = item.animalId || item.id;

    const qtyStr = String(payload.quantity || '').trim();
    if (/[eE+.-]/.test(qtyStr)) {
      setIsSaving(false);
      const err = 'Quantity must be a whole positive integer without exponents or decimals.';
      setApiError(err);
      return notify?.(err, 'error');
    }
    const qty = Number(qtyStr);
    if (!qty || isNaN(qty) || qty < 1) {
      setIsSaving(false);
      const err = 'Quantity must be at least 1';
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (qty > MAX_STOCK_QTY || qtyStr.length > MAX_QTY_DIGITS) {
      setIsSaving(false);
      const err = `Quantity cannot exceed ${formatNumber(MAX_STOCK_QTY)} animals (max 5 digits).`;
      setApiError(err);
      return notify?.(err, 'error');
    }

    const priceStr = String(payload.price || '').trim();
    if (/[eE+\-]/.test(priceStr)) {
      setIsSaving(false);
      const err = 'Scientific notation and negative amounts are not allowed for price.';
      setApiError(err);
      return notify?.(err, 'error');
    }
    const price = Number(priceStr);
    if (isNaN(price) || !Number.isFinite(price) || price < 0) {
      setIsSaving(false);
      const err = 'Price must be zero or positive';
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (price > MAX_STOCK_COST || priceStr.split('.')[0].length > MAX_COST_DIGITS) {
      setIsSaving(false);
      const err = `Additional cost cannot exceed ${formatMoney(MAX_STOCK_COST)} (10 Crore, max 9 digits).`;
      setApiError(err);
      return notify?.(err, 'error');
    }

    try {
      const response = await api.post(`/api/v1/animals/${targetId}/add-stock`, {
        quantity: qty,
        price: price,
      });

      if (response.data?.success) {
        notify?.(
          `Added ${qty} animal(s) to ${item.animalType || 'Animal'} batch #${targetId}.`,
          'success'
        );
        setModal(null);
        await loadAnimals({ typeFilter, yearFilter });
      } else {
        const errMsg = response.data?.message || 'Failed to add stock.';
        setApiError(errMsg);
        notify?.(errMsg, 'error');
      }
    } catch (err) {
      console.error('Add stock error:', err);
      const errMsg = getErrorMessage(err, 'Failed to add stock.');
      setApiError(errMsg);
      notify?.(errMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Inventory"
        title="Animal inventory"
        description="Track all animal batches, their Hissa allocations and the value held in your operation."
        action={() => {
          setApiError(null);
          setModal({ type: 'edit', item: null });
        }}
        actionLabel="Add animal batch"
        icon={Box}
      />

      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#e7d5ad] bg-[#fff8e9] px-4 py-3 text-sm text-[#765820] dark:border-[#4f3f1c] dark:bg-[#2b2312] dark:text-[#f3c46a]">
        <div className="flex items-center gap-2">
          <Info size={17} className="shrink-0" />
          <span>
            Each animal contributes <strong>7 Hissa</strong>. Booked Hissa is protected automatically against reduction.
          </span>
        </div>
        <button
          type="button"
          onClick={loadAnimals}
          disabled={isLoading}
          title="Refresh batches from server"
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-[#e7d5ad] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#765820] transition hover:bg-white dark:border-[#4f3f1c] dark:bg-[#142f26] dark:text-[#f3c46a] dark:hover:bg-[#1a3d31]"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <section className="card-surface rounded-2xl p-5 sm:p-6">
        {/* Top Header of the card */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#eee8dc] pb-4 dark:border-[#1a3d31]">
          <div>
            <p className="kicker">Active batches</p>
            <h3 className="mt-0.5 font-display text-xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              {isLoading
                ? 'Loading batches...'
                : `${filtered.length} ${
                    typeFilter === 'All Types' ? 'animal' : typeFilter
                  } batch${filtered.length === 1 ? '' : 'es'}`}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          
            <span
              title={isLoading ? '...' : `${formatNumber(totalAvailableHissa)} Hissa available`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#e5f0e8] px-3.5 py-1.5 text-xs font-bold text-[#246b59] dark:bg-[#18382d] dark:text-[#4ade80]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#246b59] dark:bg-[#4ade80]" />
              <span className="truncate">{isLoading ? '...' : `${formatNumber(totalAvailableHissa)} Hissa available`}</span>
            </span>
          </div>
        </div>

        {/* Search & Custom Dropdowns Toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80 md:w-88">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a948e] dark:text-[#698d80]"
            />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#ded8ca] bg-[#faf6ed] pl-10 pr-8 text-xs font-medium !text-[#183f35] placeholder:text-[#8a948e] transition focus:border-[#246b59] focus:bg-white focus:outline-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:placeholder:text-[#698d80] dark:focus:border-[#4ade80]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a948e] hover:text-[#183f35] dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Animal type dropdown - only shown when multiple animal types exist */}
          {hasMultipleTypes && (
            <ProjectDropdown
              value={typeFilter}
              onChange={(newType) => {
                setTypeFilter(newType);
                loadAnimals({ typeFilter: newType, yearFilter });
              }}
              options={typeOptions}
              icon={Layers}
              testId="dropdown-filter-type"
              placeholder="Filter by animal type"
              placeholderValue="All Types"
            />
          )}

          {/* Batch year dropdown */}
          <ProjectDropdown
            value={yearFilter}
            onChange={(newYear) => {
              setYearFilter(newYear);
              loadAnimals({ typeFilter, yearFilter: newYear });
            }}
            options={yearOptions}
            icon={Calendar}
            testId="dropdown-filter-year"
            placeholder="Filter by batch year"
            placeholderValue="All Years"
          />

          {/* Reset Filters action */}
          {((hasMultipleTypes && typeFilter !== 'All Types') || yearFilter !== 'All Years' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter('All Types');
                setYearFilter('All Years');
                setSearchQuery('');
                loadAnimals({ typeFilter: 'All Types', yearFilter: 'All Years' });
              }}
              className="h-10 rounded-xl px-3 text-xs font-bold text-[#a63f32] hover:bg-[#fff3f0] dark:text-[#fca5a5] dark:hover:bg-[#331614] transition"
            >
              Reset filters
            </button>
          )}
        </div>

        <InventoryTable
          items={filtered}
          isLoading={isLoading}
          onEdit={(item) => {
            setApiError(null);
            setModal({ type: 'edit', item });
          }}
          onView={(item) => setModal({ type: 'view', item })}
          onAddStock={(item) => {
            setApiError(null);
            setModal({ type: 'add-stock', item });
          }}
          onRefresh={loadAnimals}
        />
      </section>

      {modal?.type === 'edit' && (
        <InventoryModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={save}
          onAddStock={(batch) => {
            setApiError(null);
            setDuplicateBatch(null);
            setModal({ type: 'add-stock', item: batch });
          }}
          duplicateBatch={duplicateBatch}
          apiError={apiError}
          isSaving={isSaving}
          activeSeasonYear={currentYear}
          availableAnimalTypes={distinctAnimalTypes}
        />
      )}

      {modal?.type === 'add-stock' && (
        <AddStockModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={handleAddStock}
          onEditBatch={(batch) => {
            setApiError(null);
            setModal({ type: 'edit', item: batch });
          }}
          apiError={apiError}
          isSaving={isSaving}
        />
      )}

      {modal?.type === 'view' && (
        <InventoryView
          item={modal.item}
          onClose={() => setModal(null)}
          onAddStock={(item) => {
            setApiError(null);
            setModal({ type: 'add-stock', item });
          }}
          notify={notify}
        />
      )}
    </div>
  );
}
