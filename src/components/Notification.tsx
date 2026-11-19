import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface NotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: NotificationAction;
  onClose: (id: string) => void;
}

// One emerald toast for every message; only the icon changes with the type
const ICONS: Record<NotificationType, { Icon: typeof Info; tone: string }> = {
  success: { Icon: CheckCircle2, tone: "text-emerald-300" },
  error: { Icon: XCircle, tone: "text-[#F0A08C]" },
  warning: { Icon: AlertCircle, tone: "text-gold-400" },
  info: { Icon: Info, tone: "text-gold-300" },
};

const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  action,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [paused, setPaused] = useState(false);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    window.setTimeout(() => onClose(id), 250);
  }, [id, onClose]);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setIsVisible(true), 20);
    return () => window.clearTimeout(showTimer);
  }, []);

  // Auto-hide, held while the pointer or keyboard focus is on the toast
  useEffect(() => {
    if (paused) return;
    const hideTimer = window.setTimeout(handleClose, duration);
    return () => window.clearTimeout(hideTimer);
  }, [duration, paused, handleClose]);

  const { Icon, tone } = ICONS[type] ?? ICONS.info;
  const shown = isVisible && !isLeaving;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto w-full rounded-[14px] border border-gold-400/25 bg-emerald-900 text-cream shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 p-4 pr-3">
        <Icon size={20} strokeWidth={1.8} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-cream">{title}</p>
          {message && (
            <p className="mt-1 text-sm leading-relaxed text-mist">{message}</p>
          )}
          {action && (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                handleClose();
              }}
              className="btn-gold mt-3 !px-4 !py-2 !text-sm"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleClose}
          className="-mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-mist transition-colors hover:bg-gold-400/10 hover:text-cream"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Notification;
