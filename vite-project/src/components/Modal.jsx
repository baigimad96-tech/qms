import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Stack of active modals for managing browser back navigation
const modalStack = [];
let programmaticPopCount = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (programmaticPopCount > 0) {
      programmaticPopCount--;
      return;
    }

    if (modalStack.length > 0) {
      const topModal = modalStack.pop();
      topModal.isPopped = true;
      topModal.onClose?.();
    }
  });
}

export default function Modal({
  title,
  description,
  onClose,
  children,
  closeOnBack = true,
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!closeOnBack || typeof window === 'undefined') return;

    const modalId = 'modal_' + Math.random().toString(36).slice(2, 10);
    const modalEntry = {
      id: modalId,
      onClose: () => onCloseRef.current?.(),
      isPopped: false,
    };

    modalStack.push(modalEntry);

    try {
      const currentHistoryState = window.history.state;
      window.history.pushState(
        {
          ...(typeof currentHistoryState === 'object' && currentHistoryState !== null
            ? currentHistoryState
            : {}),
          __modalId: modalId,
        },
        '',
        window.location.href
      );
    } catch (err) {
      console.warn('Failed to push modal history state:', err);
    }

    return () => {
      const index = modalStack.indexOf(modalEntry);
      if (index !== -1) {
        modalStack.splice(index, 1);
      }

      if (!modalEntry.isPopped) {
        try {
          if (window.history.state?.__modalId === modalId) {
            programmaticPopCount++;
            window.history.back();
          }
        } catch (err) {
          console.warn('Failed to pop modal history state:', err);
        }
      }
    };
  }, [closeOnBack]);

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
        className="card-surface relative my-auto w-full max-w-xl max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-[#fffdf8] p-5 shadow-2xl sm:p-7 dark:bg-[#0f2820] min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-extrabold tracking-[-.04em] text-[#183f35] dark:text-[#edf6f2] break-words">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[#7b867e] dark:text-[#8ba79b] break-words">{description}</p>
            )}
          </div>
          <button
            aria-label="Close dialog"
            data-testid="button-close-modal"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-[#78847c] hover:bg-[#f1ece1] dark:text-[#8ba79b] dark:hover:bg-[#18362b]"
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

export function ModalActions({ onClose, onSubmit, submitLabel, cancel = true, disabled = false }) {
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
        disabled={disabled}
        onClick={onSubmit || (!cancel ? onClose : undefined)}
        className="btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
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
