import React from 'react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { useSettingsStore } from '../store/settingsStore';

export const ShellSidebar: React.FC = () => {
  const { settings } = useSettingsStore();

  return <Sidebar isClosed={!settings.showSidebar} />;
};
