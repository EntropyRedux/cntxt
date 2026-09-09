import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  X 
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationItem } from '../../types';

export const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-[var(--status-error)] shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />;
    }
  };

  return (
    <div className="fixed bottom-9 right-4 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none select-none">
      {notifications.map(n => (
        <div
          key={n.id}
          className="theme-card p-3 rounded shadow-2xl flex items-start gap-2.5 pointer-events-auto backdrop-blur-md animate-in slide-in-from-right-5 fade-in duration-200"
        >
          {getIcon(n.type)}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--text-primary)] text-xs truncate">{n.title}</div>
            {n.message && (
              <div className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{n.message}</div>
            )}
          </div>
          <button
            onClick={() => removeNotification(n.id)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
