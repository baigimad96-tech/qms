import React, { useState, useEffect } from 'react';
import { CalendarDays, Pencil, Info } from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import Modal, { ModalActions, Field } from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import { formatNumber } from '../data/mockData.js';
import { api } from '../services/api.js';
import { getErrorMessage } from './AnimalInventory.jsx';

export function DayCard({ day, booked, index, onEdit }) {
  const capacity = day.capacity || 100;
  const ratio = Math.min((booked / capacity) * 100, 100);
  const status = ratio >= 100 ? 'Full' : ratio >= 75 ? 'Almost Full' : 'Available';

  return (
    <div className={`card-surface fade-up delay-${index + 1} rounded-2xl p-6`}>
      <div className="flex items-start justify-between">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4e6c7] font-display text-lg font-extrabold text-[#9b6b1e] dark:bg-[#2b2413] dark:text-[#f3c46a]">
          {day.name.replace('Day ', 'D')}
        </div>
        <Badge status={status} />
      </div>
      <h3 className="mt-6 font-display text-2xl font-extrabold tracking-[-.04em] text-[#183f35] dark:text-[#edf6f2]">
        {day.name}
      </h3>
      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">Booked Hissa</p>
          <p className="mt-1 text-2xl font-bold text-[#315246] dark:text-[#edf6f2]">{formatNumber(booked)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">Remaining</p>
          <p className="mt-1 text-2xl font-bold text-[#246b59] dark:text-[#4ade80]">
            {formatNumber(Math.max(capacity - booked, 0))}
          </p>
        </div>
      </div>
      <div className="progress-track mt-5 h-2.5 overflow-hidden rounded-full">
        <div className="progress-fill h-full rounded-full" style={{ width: `${ratio}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-[#89938d] dark:text-[#789d8e]">
        <span>{formatNumber(booked)} booked</span>
        <span>{formatNumber(capacity)} capacity</span>
      </div>
      <button
        data-testid={`button-edit-${day.id}`}
        onClick={onEdit}
        className="btn-secondary mt-6 w-full justify-center"
      >
        <Pencil size={15} /> Edit capacity
      </button>
    </div>
  );
}

export function DayModal({ day, booked, onClose, onSave }) {
  const [value, setValue] = useState(day.capacity);

  return (
    <Modal
      title={`Edit ${day.name} capacity`}
      description="Capacity cannot be lower than already booked Hissa."
      onClose={onClose}
    >
      <Field label="Total capacity">
        <input
          data-testid="input-day-capacity"
          className="input"
          type="number"
          min={booked}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      <div className="mt-4 rounded-xl bg-[#f5f0e5] p-4 text-sm text-[#66766d] dark:bg-[#162f27] dark:text-[#92b1a3] dark:border dark:border-[#1e493b]">
        {formatNumber(booked)} Hissa is already booked for {day.name}. Remaining after this change:{' '}
        <strong className="text-[#246b59] dark:text-[#4ade80]">
          {formatNumber(Math.max(Number(value) - booked, 0))}
        </strong>
        .
      </div>
      <ModalActions
        onClose={onClose}
        onSubmit={() => onSave(value)}
        submitLabel="Save capacity"
      />
    </Modal>
  );
}

export default function QurbaniDays({ data, patchData, notify }) {
  const [editing, setEditing] = useState(null);
  const [days, setDays] = useState(data.days || []);
  const [bookings, setBookings] = useState(data.bookings || []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [daysRes, bkRes] = await Promise.all([
          api.get('/api/v1/qurbani-days').catch(() => null),
          api.get('/api/v1/hissa-bookings').catch(() => null),
        ]);

        if (isMounted) {
          if (daysRes?.data) {
            const rawDaysData = daysRes.data.data;
            const rawDays = Array.isArray(rawDaysData)
              ? rawDaysData
              : Array.isArray(rawDaysData?.content)
              ? rawDaysData.content
              : Array.isArray(daysRes.data)
              ? daysRes.data
              : [];
            const normalized = rawDays.map((d) => ({
              ...d,
              id: d.qurbaniDayId || d.id,
              qurbaniDayId: d.qurbaniDayId || d.id,
              name: d.name || `Day ${d.dayNumber || d.qurbaniDayId}`,
              dayNumber: d.dayNumber || d.qurbaniDayId,
              capacity: d.totalPerDay !== undefined ? d.totalPerDay : (d.capacity || 100),
              booked: d.bookedPerDay !== undefined ? d.bookedPerDay : (d.booked || 0),
              remaining: d.remaining !== undefined ? d.remaining : Math.max((d.totalPerDay || 100) - (d.bookedPerDay || 0), 0),
            }));
            setDays(normalized);
          }
          if (bkRes?.data) {
            const rawBkData = bkRes.data.data;
            const rawBk = Array.isArray(rawBkData)
              ? rawBkData
              : Array.isArray(rawBkData?.content)
              ? rawBkData.content
              : Array.isArray(bkRes.data)
              ? bkRes.data
              : [];
            setBookings(rawBk);
          }
        }
      } catch (err) {
        console.error('Failed to load Qurbani days:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  // Inspect & edit single day via API 14 (GET /api/v1/qurbani-days/:id)
  const handleOpenEdit = async (day) => {
    setEditing(day);
    const targetId = day.qurbaniDayId || day.id;
    if (targetId) {
      try {
        const response = await api.get(`/api/v1/qurbani-days/${targetId}`);
        if (response.data?.data) {
          const fresh = response.data.data;
          setEditing((prev) => ({
            ...prev,
            ...fresh,
            id: fresh.qurbaniDayId || targetId,
            qurbaniDayId: fresh.qurbaniDayId || targetId,
            capacity: fresh.totalPerDay !== undefined ? fresh.totalPerDay : prev?.capacity,
            booked: fresh.bookedPerDay !== undefined ? fresh.bookedPerDay : prev?.booked,
            remaining: fresh.remaining !== undefined ? fresh.remaining : prev?.remaining,
          }));
        }
      } catch (err) {
        console.warn(`GET /api/v1/qurbani-days/${targetId} fallback:`, err);
      }
    }
  };

  const save = async (value) => {
    const targetId = editing.qurbaniDayId || editing.id;
    const booked = editing.booked !== undefined ? editing.booked : bookings
      .filter((b) => b.day === editing.name || b.qurbaniDayId === targetId)
      .reduce((s, b) => s + (b.totalHissa || b.hissa || 0), 0);

    if (Number(value) < booked) {
      return notify(`Capacity cannot be below ${formatNumber(booked)} already booked Hissa.`, 'error');
    }

    try {
      const response = await api.patch(`/api/v1/qurbani-days/${targetId}/capacity`, {
        totalPerDay: Number(value),
      });

      if (response.data?.success) {
        const updated = response.data.data;
        const newDays = days.map((d) =>
          (d.id === targetId || d.qurbaniDayId === targetId)
            ? {
                ...d,
                capacity: updated.totalPerDay,
                booked: updated.bookedPerDay,
                remaining: updated.remaining,
              }
            : d
        );
        setDays(newDays);
        setEditing(null);
        notify(`${editing.name} capacity updated.`);
      } else {
        notify(response.data?.message || 'Failed to update capacity.', 'error');
      }
    } catch (err) {
      notify(getErrorMessage(err, 'Failed to update capacity.'), 'error');
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Planning"
        title="Qurbani days"
        description="Protect the daily promise. These three days are fixed; only their total Hissa capacity can be adjusted."
        icon={CalendarDays}
      />
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {days.map((day, i) => {
          const booked = day.booked !== undefined ? day.booked : bookings
            .filter((b) => b.day === day.name || b.qurbaniDayId === day.id)
            .reduce((s, b) => s + (b.totalHissa || b.hissa || 0), 0);
          return (
            <DayCard
              key={day.id}
              day={day}
              booked={booked}
              index={i}
              onEdit={() => handleOpenEdit(day)}
            />
          );
        })}
      </div>
      <div className="card-surface flex items-start gap-3 rounded-2xl p-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f7eaca] text-[#9b6b1e] dark:bg-[#2b2413] dark:text-[#f3c46a]">
          <Info size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-[#315246] dark:text-[#edf6f2]">Fixed Qurbani schedule</p>
          <p className="mt-1 text-sm leading-6 text-[#78847c] dark:text-[#92b1a3]">
            Day names and order are intentionally fixed for the 2025 season. Capacity changes are recorded in the audit log.
          </p>
        </div>
      </div>
      {editing && (
        <DayModal
          day={editing}
          booked={editing.booked !== undefined ? editing.booked : bookings
            .filter((b) => b.day === editing.name || b.qurbaniDayId === (editing.qurbaniDayId || editing.id))
            .reduce((s, b) => s + (b.totalHissa || b.hissa || 0), 0)}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}
