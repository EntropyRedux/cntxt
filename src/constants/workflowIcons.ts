/**
 * Workflow & Bookmark Icon Catalog
 * 48 curated Lucide icons grouped into thematic categories for backwards compatibility.
 */

export interface IconCategoryGroup {
  name: string;
  icons: string[];
}

export const WORKFLOW_ICON_GROUPS: IconCategoryGroup[] = [
  {
    name: 'Common',
    icons: [
      'Workflow',
      'Bookmark',
      'FileText',
      'Code',
      'Zap',
      'Settings',
      'Star',
      'Folder',
      'Sparkles',
      'Layers'
    ]
  },
  {
    name: 'Productivity & Tasks',
    icons: [
      'CheckSquare',
      'Target',
      'Rocket',
      'Clock',
      'Calendar',
      'Briefcase',
      'Lightbulb',
      'Activity'
    ]
  },
  {
    name: 'Development & Data',
    icons: [
      'Terminal',
      'Database',
      'Cpu',
      'GitBranch',
      'Boxes',
      'FileCode',
      'Braces',
      'Bug'
    ]
  },
  {
    name: 'Content & Communication',
    icons: [
      'MessageSquare',
      'Mail',
      'BookOpen',
      'Tag',
      'Globe',
      'PenTool',
      'Share2'
    ]
  },
  {
    name: 'Media & Utilities',
    icons: [
      'Image',
      'Music',
      'Video',
      'Camera',
      'Shield',
      'Lock',
      'Coffee',
      'Heart',
      'Map',
      'Compass',
      'Archive',
      'Sliders',
      'HelpCircle'
    ]
  }
];

export const ALL_WORKFLOW_ICONS: string[] = WORKFLOW_ICON_GROUPS.flatMap(g => g.icons);

export { DEFAULT_WORKFLOW_ICON, DEFAULT_BOOKMARK_ICON, ALL_APP_ICONS, APP_ICON_MAP } from './iconCatalog';
