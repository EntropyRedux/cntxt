import React from 'react';
import { LucideProps } from 'lucide-react';
import { AppIcon } from '../../Common/AppIcon';
import { DEFAULT_WORKFLOW_ICON, DEFAULT_BOOKMARK_ICON, APP_ICON_MAP } from '../../../constants/iconCatalog';

export const WORKFLOW_ICON_MAP = APP_ICON_MAP;

export interface WorkflowIconProps extends LucideProps {
  name?: string;
  type?: 'workflow' | 'bookmark';
}

export const WorkflowIcon: React.FC<WorkflowIconProps> = ({
  name,
  type = 'workflow',
  size = 16,
  className,
  ...props
}) => {
  const fallback = type === 'bookmark' ? DEFAULT_BOOKMARK_ICON : DEFAULT_WORKFLOW_ICON;
  return (
    <AppIcon
      name={name || fallback}
      fallbackIcon={fallback}
      size={size}
      className={className}
      {...props}
    />
  );
};
