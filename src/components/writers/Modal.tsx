import { ReactNode, useEffect, useId } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Minimal accessible dialog: Escape and backdrop click close it. */
const Modal = ({ open, title, onClose, children }: ModalProps) => {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl border border-dark-4 bg-dark-2 p-6"
      >
        <div className="flex-between mb-5 gap-4">
          <h3 id={titleId} className="h3-bold">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-light-3 hover:text-light-1 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
