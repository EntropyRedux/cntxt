import React from 'react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { useSettingsStore } from '../store/settingsStore';

export const ShellSidebar: React.FC = () => {
  const { settings } = useSettingsStore();

  if (!settings.showSidebar) return null;

  return (
    <aside className="shrink-0 flex h-full z-20">
      <Sidebar />
    </aside>
  );
};
