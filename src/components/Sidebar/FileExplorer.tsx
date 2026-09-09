import React, { useState } from 'react';
import { 
  FilePlus, 
  Folder, 
  FileText, 
  Upload, 
  ChevronRight, 
  ChevronDown,
  Menu
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTemplateStore } from '../../store/templateStore';

interface VirtualFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: VirtualFile[];
}

const INITIAL_PROJECT_FILES: VirtualFile[] = [
  {
    id: 'f-draft',
    name: 'draft_system_prompt.md',
    type: 'file',
    content: `# System Prompt: Creative Assistant\n\nYou are a highly capable agent named {{agent_name:ContextBot}}.\nYour primary objective is to facilitate workflow automation.\n\n{=DATE_ISO()} Initial Draft\n\n## Guidelines\n- Maintain professional tone.\n- Format output as markdown.\n- Use !important markers for constraints.`,
    language: 'markdown'
  },
  {
    id: 'f-user',
    name: 'user_persona.json',
    type: 'file',
    content: `{\n  "persona": "Prompt Engineer",\n  "experience": "Senior",\n  "models": ["GPT-4o", "Claude 3.7", "Gemini 2.0 Flash"],\n  "created": "{=TODAY()}"\n}`,
    language: 'json'
  },
  {
    id: 'f-readme',
    name: 'README.md',
    type: 'file',
    content: `# ContextPad Workspace\n\nStructured writing, prompt engineering, technical drafting, and workflow automation.`,
    language: 'markdown'
  },
  {
    id: 'folder-specs',
    name: 'specifications',
    type: 'folder',
    children: [
      { id: 'f-api', name: 'openapi_schema.yaml', type: 'file', content: 'openapi: 3.0.0\ninfo:\n  title: ContextPad Workspace API\n  version: 1.10.0', language: 'yaml' },
      { id: 'f-arch', name: 'architecture_rfc.md', type: 'file', content: '# RFC 101: Workspace Sync\n\nDate: {=TODAY()}', language: 'markdown' }
    ]
  }
];

export const FileExplorer: React.FC = () => {
  const [files, setFiles] = useState<VirtualFile[]>(() => {
    const saved = localStorage.getItem('contextpad_virtual_files');
    return saved ? JSON.parse(saved) : INITIAL_PROJECT_FILES;
  });

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'folder-specs': true
  });

  const { createTab, tabs, activeTabId, setActiveTabId } = useTabStore();
  const { templates } = useTemplateStore();
  const { addNotification } = useNotificationStore();

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleOpenFile = (file: VirtualFile) => {
    const existing = tabs.find(t => t.title === file.name);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      createTab(file.name, file.content || '', (file.language as any) || 'markdown');
    }
  };

  const handleCreateNewFile = () => {
    const name = prompt('Enter new file name:', 'new_prompt.md');
    if (!name) return;

    const newFile: VirtualFile = {
      id: `file_${Date.now()}`,
      name,
      type: 'file',
      content: `# ${name}\n\nCreated: {=NOW()}`,
      language: name.endsWith('.json') ? 'json' : name.endsWith('.js') ? 'javascript' : 'markdown'
    };

    const updated = [...files, newFile];
    setFiles(updated);
    localStorage.setItem('contextpad_virtual_files', JSON.stringify(updated));
    createTab(newFile.name, newFile.content, newFile.language as any);
    addNotification('File Created', name, 'success');
  };

  const handleNativeOpenFile = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker();
        const file = await handle.getFile();
        const content = await file.text();
        createTab(file.name, content, 'markdown', handle.name);
        addNotification('File Opened', file.name, 'success');
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const content = await file.text();
          createTab(file.name, content, 'markdown');
          addNotification('File Opened', file.name, 'success');
        };
        input.click();
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        addNotification('Could not open file', e.message, 'error');
      }
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="theme-sidebar flex flex-col h-full text-xs select-none">
      {/* Header controls */}
      <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex justify-between items-center border-b border-[var(--border-primary)]">
        <span>Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateNewFile}
            title="New File"
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNativeOpenFile}
            title="Open Disk File"
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-0.5">
          {files.map(item => (
            <FileTreeNode
              key={item.id}
              item={item}
              activeFileName={activeTab?.title}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onOpenFile={handleOpenFile}
            />
          ))}
        </div>

        {/* Pinned Templates Section */}
        <div className="mt-6 border-t border-[var(--border-primary)] pt-4 px-1">
          <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 px-1">Pinned Templates</div>
          <div className="flex flex-col gap-0.5">
            {templates.slice(0, 4).map((tmpl, i) => {
              const dotColors = ['bg-[#E06C75]', 'bg-[#98C379]', 'bg-[#61AFEF]', 'bg-[#E5C07B]'];
              return (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    if (activeTab) {
                      useTabStore.getState().insertTextAtCursor(activeTab.id, tmpl.content);
                      addNotification('Template Inserted', tmpl.name, 'success');
                    }
                  }}
                  className="text-xs p-1.5 flex items-center gap-2 text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] rounded cursor-pointer transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                  <span className="truncate">{tmpl.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="p-2 px-3 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
        <span>Workspace Files</span>
        <span className="text-[var(--status-success)] font-medium">● Synced</span>
      </div>
    </div>
  );
};

const getFileIconColor = (name: string) => {
  if (name.endsWith('.md')) return 'var(--status-success)';
  if (name.endsWith('.json')) return 'var(--status-warning)';
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'var(--accent-primary)';
  if (name.endsWith('.js') || name.endsWith('.ts')) return 'var(--accent-primary)';
  return 'var(--text-muted)';
};

const FileTreeNode: React.FC<{
  item: VirtualFile;
  activeFileName?: string;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (id: string) => void;
  onOpenFile: (file: VirtualFile) => void;
}> = ({ item, activeFileName, expandedFolders, toggleFolder, onOpenFile }) => {
  if (item.type === 'folder') {
    const isExpanded = !!expandedFolders[item.id];
    return (
      <div>
        <button
          onClick={() => toggleFolder(item.id)}
          className="w-full flex items-center gap-1.5 p-1.5 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-left"
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
          <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="truncate font-medium text-xs text-[var(--text-primary)]">{item.name}</span>
        </button>

        {isExpanded && item.children && (
          <div className="pl-3 border-l border-[var(--border-primary)] ml-2 my-0.5 space-y-0.5">
            {item.children.map(child => (
              <FileTreeNode
                key={child.id}
                item={child}
                activeFileName={activeFileName}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                onOpenFile={onOpenFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeFileName === item.name;
  const strokeColor = getFileIconColor(item.name);

  return (
    <div
      onClick={() => onOpenFile(item)}
      className={`text-xs flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
        isActive 
          ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.5" className="shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="truncate">{item.name}</span>
    </div>
  );
};
