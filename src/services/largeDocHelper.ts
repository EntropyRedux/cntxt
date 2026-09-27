import { SupportedLanguage } from '../../contracts/data_shapes';
import { useTabStore } from '../store/tabStore';
import { useSettingsStore } from '../store/settingsStore';
import { useLargeDocModalStore } from '../store/largeDocModalStore';

export interface OpenDocumentOptions {
  title: string;
  content: string;
  language?: SupportedLanguage;
  filePath?: string | null;
  existingTabId?: string;
}

export function isDocumentLarge(content: string): boolean {
  const settings = useSettingsStore.getState().settings;
  if (settings.enableLargeDocDetection === false) {
    return false;
  }
  const sizeKb = Math.round(new Blob([content]).size / 1024);
  const lineCount = content.split('\n').length;
  const thresholdKb = settings.largeDocThresholdKb ?? 500;
  const thresholdLines = settings.largeDocThresholdLines ?? 10000;

  return sizeKb >= thresholdKb || lineCount >= thresholdLines;
}

export function openDocumentWithLargeDocCheck(options: OpenDocumentOptions): string {
  const { title, content, language = 'markdown', filePath = null, existingTabId } = options;
  const isLarge = isDocumentLarge(content);

  let targetTabId = existingTabId;
  if (!targetTabId) {
    targetTabId = useTabStore.getState().createTab(
      title,
      isLarge ? '' : content,
      language,
      filePath
    );
  } else if (!isLarge) {
    useTabStore.getState().updateTabContent(targetTabId, content);
  }

  if (isLarge) {
    useLargeDocModalStore.getState().openLargeDocModal(targetTabId, title, content);
  }

  return targetTabId;
}
