import React, { useState, useEffect, useRef } from 'react';
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
  X,
} from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import Modal, { ModalActions, Field } from '../components/Modal.jsx';
import { TableScroll, Th, Td, IconButton } from '../components/Table.jsx';
import { formatNumber, formatMoney } from '../data/mockData.js';
import { api } from '../services/api.js';
import ProjectDropdown from '../components/ProjectDropdown.jsx';

// Helper function to extract error message from API response
export function getErrorMessage(err, fallback = 'An unexpected error occurred.') {
  if (!err?.response) {
    return err?.message || fallback;
  }
  const status = err.response.status;
  const resData = err.response.data;

  if (status === 400) {
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

  return resData?.message || resData?.error || fallback;
}


// Table Component
export function InventoryTable({ items, isLoading, onEdit, onView, onAddStock, onRefresh }) {
  return (
    <TableScroll>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <Th>Animal Type</Th>
            <Th>Batch Year</Th>
            <Th>Total Animals</Th>
            <Th>Total Hissa</Th>
            <Th>Booked Hissa</Th>
            <Th>Available Hissa</Th>
            <Th>Total Price</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={8} className="py-10 text-center text-[#78847c] dark:text-[#92b1a3]">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-[#246b59] dark:text-[#4ade80]" />
                  <span>Loading animal batches from server...</span>
                </div>
              </Td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <Td colSpan={8} className="py-10 text-center text-[#78847c] dark:text-[#92b1a3]">
                <div className="space-y-2">
                  <p className="font-semibold text-[#315246] dark:text-[#e0eee6]">No active batches match your filter</p>
                  <p className="text-xs">Create a new batch or reset your search & dropdown filters.</p>
                </div>
              </Td>
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
                  <Td>{formatNumber(item.totalAnimals)}</Td>
                  <Td className="font-bold text-[#183f35] dark:text-[#edf6f2]">{formatNumber(item.totalHissa)}</Td>
                  <Td>
                    <span className={item.bookedHissa > 0 ? 'font-semibold text-[#9b6b1e] dark:text-[#f3c46a]' : ''}>
                      {formatNumber(item.bookedHissa || 0)}
                    </span>
                  </Td>
                  <Td>
                    <span className={`font-bold ${available > 0 ? 'text-[#246b59] dark:text-[#4ade80]' : 'text-[#a63f32] dark:text-[#fca5a5]'}`}>
                      {formatNumber(available)}
                    </span>
                  </Td>
                  <Td className="font-mono font-medium">{formatMoney(item.totalPrice)}</Td>
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

  const qty = Number(form.quantity || 0);
  const addPrice = Number(form.price || 0);
  const currentTotal = Number(item?.totalAnimals || 0);
  const currentPrice = Number(item?.totalPrice || 0);
  const currentHissa = Number(item?.totalHissa || currentTotal * 7);

  const additionalHissa = qty * 7;
  const newTotalAnimals = currentTotal + qty;
  const newTotalHissa = currentHissa + additionalHissa;
  const newTotalPrice = currentPrice + addPrice;

  return (
    <Modal
      title={`Add Stock to ${item.animalType || 'Animal'} Batch #${item.animalId || item.id}`}
      description="Quickly replenish live animal stock and auto-expand available Hissa allocation."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form, item);
        }}
      >
        {apiError && (
          <div className="mb-4 rounded-xl border border-[#efb7ae] bg-[#fff3f0] p-3 text-sm text-[#a63f32] dark:border-[#5d2520] dark:bg-[#331614] dark:text-[#fca5a5]">
            {apiError}
          </div>
        )}

        {/* Current status summary banner */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#ded7c8] bg-[#faf7f0] p-3.5 text-xs text-[#526359] dark:border-[#21473a] dark:bg-[#122b22] dark:text-[#b4cbbe]">
          <div>
            <span className="font-bold text-[#183f35] dark:text-[#edf6f2]">{item.animalType || 'Animal'}</span> ({item.batchYear})
          </div>
          <div>
            Current: <strong className="text-[#183f35] dark:text-[#edf6f2]">{formatNumber(currentTotal)} animals</strong> · {formatMoney(currentPrice)}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Additional Quantity (Animals)">
            <input
              data-testid="input-add-stock-quantity"
              className="input"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="e.g. 5"
              disabled={isSaving}
              required
              autoFocus
            />
          </Field>
          <Field label="Additional Cost (₹ Total)">
            <input
              data-testid="input-add-stock-price"
              className="input"
              type="number"
              min="0"
              step="any"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="e.g. 250000"
              disabled={isSaving}
              required
            />
          </Field>
        </div>

        {/* Real-time calculated projection */}
        <div className="mt-5 grid gap-3 rounded-xl bg-[#e4efe7]/50 p-4 sm:grid-cols-3 dark:bg-[#162f27] dark:border dark:border-[#1e493b]">
          <div>
            <p className="text-xs text-[#526359] dark:text-[#92b1a3]">New Total Animals</p>
            <p className="mt-1 font-display text-xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              {formatNumber(newTotalAnimals)}
            </p>
            <p className="text-[11px] font-semibold text-[#246b59] dark:text-[#4ade80]">
              (+{formatNumber(qty)} animals)
            </p>
          </div>
          <div>
            <p className="text-xs text-[#526359] dark:text-[#92b1a3]">New Total Hissa</p>
            <p className="mt-1 font-display text-xl font-extrabold text-[#246b59] dark:text-[#4ade80]">
              {formatNumber(newTotalHissa)}
            </p>
            <p className="text-[11px] font-semibold text-[#246b59] dark:text-[#4ade80]">
              (+{formatNumber(additionalHissa)} hissa)
            </p>
          </div>
          <div>
            <p className="text-xs text-[#526359] dark:text-[#92b1a3]">New Total Batch Value</p>
            <p className="mt-1 font-display text-xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              {formatMoney(newTotalPrice)}
            </p>
            <p className="text-[11px] font-semibold text-[#9b6b1e] dark:text-[#f3c46a]">
              (+{formatMoney(addPrice)})
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
          disabled={isSaving || qty < 1 || isNaN(addPrice) || addPrice < 0}
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
}) {
  const [form, setForm] = useState({
    batchYear: item?.batchYear ?? new Date().getFullYear(),
    totalAnimals: item?.totalAnimals ?? '',
    totalPrice: item?.totalPrice ?? '',
    animalType: item?.animalType || item?.animal || 'Buffalo',
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const computedTotalHissa = Number(form.totalAnimals || 0) * 7;
  const bookedCount = item?.bookedHissa || 0;
  const computedAvailableHissa = Math.max(computedTotalHissa - bookedCount, 0);

  return (
    <Modal
      title={item ? `Edit ${item.animalType || 'Animal'} batch` : 'Add Animal batch'}
      description="Keep the physical batch record and its Hissa math aligned (7 Hissa per animal)."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
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
            <input
              data-testid="input-animal-type"
              className="input"
              list="animal-type-datalist"
              value={form.animalType}
              onChange={(e) => set('animalType', e.target.value)}
              placeholder="e.g. Buffalo, Camel, Goat..."
              disabled={isSaving}
              required
            />
            <datalist id="animal-type-datalist">
              <option value="Buffalo" />
              <option value="Mini Buffalo" />
              <option value="Camel" />
              <option value="Goat" />
              <option value="Sheep" />
              <option value="Cow" />
            </datalist>
          </Field>
          <Field label="Batch Year">
            <input
              data-testid="input-batch-year"
              className="input"
              type="number"
              min="2020"
              max="2035"
              value={form.batchYear}
              onChange={(e) => set('batchYear', e.target.value)}
              disabled={isSaving}
              required
            />
          </Field>
          <Field label="Total Animals">
            <input
              data-testid="input-total-animals"
              className="input"
              type="number"
              min="1"
              value={form.totalAnimals}
              onChange={(e) => set('totalAnimals', e.target.value)}
              disabled={isSaving}
              placeholder="e.g. 10"
              required
            />
          </Field>
          <Field label="Total Price (₹)">
            <input
              data-testid="input-total-price"
              className="input"
              type="number"
              min="0"
              step="any"
              value={form.totalPrice}
              onChange={(e) => set('totalPrice', e.target.value)}
              disabled={isSaving}
              placeholder="e.g. 350000"
              required
            />
          </Field>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl bg-[#f5f0e5] p-4 sm:grid-cols-2 dark:bg-[#162f27] dark:border dark:border-[#1e493b]">
          <div>
            <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">Auto-calculated Total Hissa</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              {formatNumber(computedTotalHissa)}
            </p>
            <p className="text-[11px] text-[#8a948e] dark:text-[#789d8e]">({form.totalAnimals || 0} animals × 7)</p>
          </div>
          <div>
            <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">Available Hissa after bookings</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-[#246b59] dark:text-[#4ade80]">
              {formatNumber(computedAvailableHissa)}
            </p>
            {bookedCount > 0 && (
              <p className="text-[11px] text-[#9b6b1e] dark:text-[#f3c46a]">
                ({formatNumber(bookedCount)} hissa already booked)
              </p>
            )}
          </div>
        </div>

        {bookedCount > 0 && computedTotalHissa < bookedCount && (
          <div className="mt-3 rounded-xl border border-[#efb7ae] bg-[#fff3f0] p-3 text-xs font-semibold text-[#a63f32] dark:border-[#5d2520] dark:bg-[#331614] dark:text-[#fca5a5]">
            ⚠️ Capacity protection: Cannot reduce total hissa ({formatNumber(computedTotalHissa)}) below {formatNumber(bookedCount)} booked hissa. Minimum {Math.ceil(bookedCount / 7)} animals required.
          </div>
        )}

        <ModalActions
          onClose={onClose}
          submitLabel={isSaving ? 'Saving...' : item ? 'Save changes' : `Add ${form.animalType || 'Animal'} batch`}
          disabled={isSaving || (bookedCount > 0 && computedTotalHissa < bookedCount)}
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
        ['Total Price', formatMoney(displayItem.totalPrice)],
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
            <div key={label} className="soft-inset rounded-xl p-4">
              <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">{label}</p>
              <p className="mt-1 font-bold text-[#315246] dark:text-[#edf6f2]">{value}</p>
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
            <span>Add Stock (+)</span>
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

  const currentYear = new Date().getFullYear();
  const [knownYears, setKnownYears] = useState([currentYear]);

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

    const animals = Number(form.totalAnimals);
    if (!animals || animals < 1) {
      setIsSaving(false);
      const errText = 'Total animals count must be greater than zero';
      setApiError(errText);
      return notify?.(errText, 'error');
    }

    const price = Number(form.totalPrice);
    if (isNaN(price) || price < 0) {
      setIsSaving(false);
      const errText = 'Total price must be zero or a positive amount';
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
    const qty = Number(payload.quantity);
    const price = Number(payload.price);

    if (!qty || qty < 1) {
      setIsSaving(false);
      const err = 'Quantity must be at least 1';
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (isNaN(price) || price < 0) {
      setIsSaving(false);
      const err = 'Price must be zero or positive';
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
          
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f0e8] px-3.5 py-1.5 text-xs font-bold text-[#246b59] dark:bg-[#18382d] dark:text-[#4ade80]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#246b59] dark:bg-[#4ade80]" />
              {isLoading ? '...' : `${formatNumber(totalAvailableHissa)} Hissa available`}
            </span>
          </div>
        </div>

        {/* Search & Custom Dropdowns Toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a948e] dark:text-[#698d80]"
            />
            <input
              type="text"
              placeholder="Search by type, year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#ded8ca] bg-[#faf6ed] pl-10 pr-8 text-xs font-medium !text-[#183f35] placeholder:text-[#8a948e] transition focus:border-[#246b59] focus:bg-white focus:outline-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:placeholder:text-[#698d80] dark:focus:border-[#4ade80]"            />
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
          {(typeFilter !== 'All Types' || yearFilter !== 'All Years' || searchQuery) && (
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
