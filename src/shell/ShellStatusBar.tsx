import React from 'react';
import { StatusBar } from '../components/StatusBar/StatusBar';
import { useSettingsStore } from '../store/settingsStore';

export const ShellStatusBar: React.FC = () => {
  const { settings } = useSettingsStore();

  if (!settings.showStatusBar) return null;

  return (
    <footer className="hidden md:block shrink-0 z-20">
      <StatusBar />
    </footer>
  );
};
