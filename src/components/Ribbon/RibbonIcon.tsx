import React from 'react';
import { APP_ICON_MAP, ALL_APP_ICONS, DEFAULT_APP_ICON } from '../../constants/iconCatalog';
import { AppIcon } from '../Common/AppIcon';

export const ICON_MAP = APP_ICON_MAP;
export const AVAILABLE_ICONS = ALL_APP_ICONS;

export interface RibbonIconProps {
  name: string;
  className?: string;
  strokeWidth?: number;
}

export const RibbonIcon: React.FC<RibbonIconProps> = ({
  name,
  className = 'w-3.5 h-3.5',
  strokeWidth = 2.2
}) => {
  return (
    <AppIcon
      name={name}
      fallbackIcon={DEFAULT_APP_ICON}
      className={className}
      strokeWidth={strokeWidth}
    />
  );
};
