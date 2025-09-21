import React, { createContext, useContext, useState, useCallback } from "react";
import Notification, { NotificationType } from "../components/Notification";

interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
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
      {/* Render notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
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
