export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface UiNotification {
  id: string;
  title: string;
  message?: string;
  type: NotificationType;
  timestamp: number;
  duration?: number; // ms before auto dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationEventContracts {
  onDismissNotification: (id: string) => void;
  onAddNotification: (title: string, message?: string, type?: NotificationType) => void;
  onClearAllNotifications: () => void;
}
