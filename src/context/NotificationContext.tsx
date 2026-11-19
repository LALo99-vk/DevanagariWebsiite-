import React, { createContext, useContext, useState, useCallback } from "react";
import Notification, {
  NotificationAction,
  NotificationType,
} from "../components/Notification";

interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  /** optional button inside the toast, e.g. "Sign in with Google" */
  action?: NotificationAction;
}

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationData, "id">) => void;
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, duration?: number) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const showNotification = useCallback(
    (notification: Omit<NotificationData, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications((prev) => [...prev, { ...notification, id }]);
    },
    []
  );

  const showSuccess = useCallback(
    (title: string, message: string, duration = 5000) => {
      showNotification({ type: "success", title, message, duration });
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message: string, duration = 7000) => {
      showNotification({ type: "error", title, message, duration });
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, duration = 6000) => {
      showNotification({ type: "warning", title, message, duration });
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, duration = 5000) => {
      showNotification({ type: "info", title, message, duration });
    },
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      {/* Toast stack: under the navbar, top right; full width on phones */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-28 z-[60] flex flex-col gap-3 sm:inset-x-auto sm:right-6 sm:w-[24rem]"
      >
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            {...notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};
