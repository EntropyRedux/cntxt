import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '../src/store/notificationStore';

describe('NotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: []
    });
    // Clear any active timers
    const store = useNotificationStore.getState();
    store.clearAllTimers();
  });

  it('creates and displays a notification', () => {
    const store = useNotificationStore.getState();
    const id = store.addNotification('Operation Complete', 'File saved successfully', 'success');

    expect(id).toBeDefined();
    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(1);
    expect(notifications[0].id).toBe(id);
    expect(notifications[0].title).toBe('Operation Complete');
    expect(notifications[0].message).toBe('File saved successfully');
    expect(notifications[0].type).toBe('success');
  });

  it('supports all notification types', () => {
    const store = useNotificationStore.getState();
    
    store.addNotification('Success', 'Done', 'success');
    store.addNotification('Error', 'Failed', 'error');
    store.addNotification('Warning', 'Caution', 'warning');
    store.addNotification('Notice', 'Info', 'info');

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(4);
    expect(notifications.map(n => n.type)).toEqual(['info', 'warning', 'error', 'success']);
  });

  it('removes a specific notification by id', () => {
    const store = useNotificationStore.getState();
    const id1 = store.addNotification('First', 'Msg1', 'info');
    const id2 = store.addNotification('Second', 'Msg2', 'info');

    store.removeNotification(id1);
    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(1);
    expect(notifications[0].id).toBe(id2);
  });

  it('clears all notifications', () => {
    const store = useNotificationStore.getState();
    store.addNotification('A', 'Msg', 'success');
    store.addNotification('B', 'Msg', 'error');

    store.clearAll();
    expect(useNotificationStore.getState().notifications.length).toBe(0);
  });

  it('limits notifications to 5 most recent', () => {
    const store = useNotificationStore.getState();
    
    // Add 6 notifications
    for (let i = 0; i < 6; i++) {
      store.addNotification(`Notification ${i}`, 'Message', 'info');
    }

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.length).toBe(5); // Only keeps 5 most recent
    expect(notifications[0].title).toBe('Notification 5'); // Most recent first
  });

  it('notifications have timestamp', () => {
    const store = useNotificationStore.getState();
    const before = Date.now();
    const id = store.addNotification('Timed', 'Message');
    const after = Date.now();

    const notifications = useNotificationStore.getState().notifications;
    const notification = notifications.find(n => n.id === id);
    expect(notification?.timestamp).toBeGreaterThanOrEqual(before);
    expect(notification?.timestamp).toBeLessThanOrEqual(after);
  });

  it('removes notification and clears its timer', () => {
    const store = useNotificationStore.getState();
    const id = store.addNotification('WillRemove', 'Message');
    
    // Adding creates a timer
    const notificationsBefore = useNotificationStore.getState().notifications.length;
    
    store.removeNotification(id);
    const notificationsAfter = useNotificationStore.getState().notifications.length;
    
    expect(notificationsAfter).toBe(notificationsBefore - 1);
  });
});
