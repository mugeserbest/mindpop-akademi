"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  headerIcon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({
  open,
  title,
  headerIcon,
  onClose,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const body = document.body;
    const activeModalCount = Number(body.dataset.modalScrollLocks ?? "0");

    if (activeModalCount === 0) {
      body.dataset.previousOverflow = body.style.overflow;
      body.style.overflow = "hidden";
    }

    body.dataset.modalScrollLocks = String(activeModalCount + 1);

    return () => {
      const remainingModalCount = Math.max(
        Number(body.dataset.modalScrollLocks ?? "1") - 1,
        0,
      );

      if (remainingModalCount === 0) {
        body.style.overflow = body.dataset.previousOverflow ?? "";
        delete body.dataset.modalScrollLocks;
        delete body.dataset.previousOverflow;
        return;
      }

      body.dataset.modalScrollLocks = String(remainingModalCount);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card border-card bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-[-1.5rem] z-10 -mx-6 -mt-6 flex items-center justify-between gap-2 border-b border-beige bg-white px-6 pt-6 pb-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {headerIcon}
            <h2
              id="modal-title"
              className="min-w-0 font-heading text-l font-semibold text-black"
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Pencereyi kapat"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-xl font-bold text-black transition hover:bg-beige"
          >
            ×
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
