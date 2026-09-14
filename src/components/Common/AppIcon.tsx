import React from 'react';
import { LucideProps, Sparkles } from 'lucide-react';
import { APP_ICON_MAP, DEFAULT_APP_ICON } from '../../constants/iconCatalog';

export interface AppIconProps extends LucideProps {
  name?: string;
  fallbackIcon?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  fallbackIcon = DEFAULT_APP_ICON,
  size = 16,
  strokeWidth = 2,
  className,
  ...props
}) => {
  if (!name) {
    const Fallback = APP_ICON_MAP[fallbackIcon] || Sparkles;
    return <Fallback size={size} strokeWidth={strokeWidth} className={className} {...props} />;
  }

  // Exact match
  let IconComponent = APP_ICON_MAP[name];

  // Case-insensitive fallback lookup
  if (!IconComponent) {
    const lower = name.toLowerCase();
    const foundKey = Object.keys(APP_ICON_MAP).find(k => k.toLowerCase() === lower);
    if (foundKey) {
      IconComponent = APP_ICON_MAP[foundKey];
    }
  }

  if (!IconComponent) {
    IconComponent = APP_ICON_MAP[fallbackIcon] || Sparkles;
  }

  return <IconComponent size={size} strokeWidth={strokeWidth} className={className} {...props} />;
};
