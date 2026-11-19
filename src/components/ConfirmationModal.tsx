import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

export type ConfirmationType = "warning" | "success" | "error" | "info";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  isLoading?: boolean;
}

// Same icon language as the toasts
const ICONS: Record<ConfirmationType, { Icon: typeof Info; tone: string }> = {
  success: { Icon: CheckCircle2, tone: "text-emerald-300" },
  error: { Icon: XCircle, tone: "text-[#F0A08C]" },
  warning: { Icon: AlertTriangle, tone: "text-[#F0A08C]" },
  info: { Icon: Info, tone: "text-gold-300" },
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
  isLoading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !isLoading && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const { Icon, tone } = ICONS[type] ?? ICONS.warning;
  // destructive confirmations (delete) read in coral, everything else in gold
  const destructive = type === "warning" || type === "error";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={() => !isLoading && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[14px] border border-gold-400/25 bg-emerald-900 p-6 sm:p-7 text-cream shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-3">
          <Icon size={22} strokeWidth={1.8} className={tone} aria-hidden="true" />
          <h3 id="confirm-title" className="font-display text-2xl leading-tight">
            {title}
          </h3>
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-mist">{message}</p>

        <div className="mt-7 flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn-outline-gold flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            autoFocus
            className={
              destructive
                ? "inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#F0A08C] px-6 py-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-[#F4B5A4] disabled:cursor-not-allowed disabled:opacity-50"
                : "btn-gold flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-950/30 border-t-emerald-950" />
                Processing…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
