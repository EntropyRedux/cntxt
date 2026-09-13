import { IStorageBridge } from '../ui-contract/bridgeContract';
import { useNotificationStore } from '../store/notificationStore';

/**
 * Safely persists data to storage bridge, catching write/quota rejections
 * and surfacing actionable error notifications to the user instead of silent data loss.
 */
export async function safePersist(
  storage: IStorageBridge | null,
  key: string,
  value: string,
  contextName: string
): Promise<boolean> {
  if (!storage) return false;
  try {
    await storage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.error(`[Storage Persistence Error] Failed to persist ${contextName}:`, err);
    useNotificationStore.getState().addNotification(
      'Storage Error',
      `Could not save ${contextName}. Local storage may be full or restricted.`,
      'error'
    );
    return false;
  }
}

/**
 * Safely removes a key from storage bridge, catching rejections without throwing.
 */
export async function safeRemove(
  storage: IStorageBridge | null,
  key: string,
  contextName: string
): Promise<boolean> {
  if (!storage) return false;
  try {
    await storage.removeItem(key);
    return true;
  } catch (err: any) {
    console.error(`[Storage Removal Error] Failed to remove ${contextName}:`, err);
    useNotificationStore.getState().addNotification(
      'Storage Error',
      `Could not delete ${contextName}. Local storage may be restricted.`,
      'error'
    );
    return false;
  }
}

