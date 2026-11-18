import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ title, description, onClose, children }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const modalNode = (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="card-surface relative my-auto w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#fffdf8] p-5 shadow-2xl sm:p-7 dark:bg-[#0f2820]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-[-.04em] text-[#183f35] dark:text-[#edf6f2]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[#7b867e] dark:text-[#8ba79b]">{description}</p>
            )}
          </div>
          <button
            aria-label="Close dialog"
            data-testid="button-close-modal"
            onClick={onClose}
            className="rounded-lg p-2 text-[#78847c] hover:bg-[#f1ece1] dark:text-[#8ba79b] dark:hover:bg-[#18362b]"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
}

export function ModalActions({ onClose, onSubmit, submitLabel, cancel = true }) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      {cancel && (
        <button
          type="button"
          data-testid="button-modal-cancel"
          onClick={onClose}
          className="btn-secondary justify-center"
        >
          Cancel
        </button>
      )}
      <button
        type={onSubmit ? 'button' : 'submit'}
        data-testid="button-modal-submit"
        onClick={onSubmit || (!cancel ? onClose : undefined)}
        className="btn-primary justify-center"
      >
        {submitLabel}
      </button>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[.07em] text-[#68776e]">
        {label}
      </span>
      {children}
    </label>
  );
}
