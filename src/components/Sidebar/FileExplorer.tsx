import React, { useState, useEffect } from 'react';
import { 
  FilePlus, 
  Folder, 
  FolderPlus,
  Upload, 
  ChevronRight, 
  ChevronDown,
  Pin,
  PinOff,
  History,
  Trash2,
  Clock,
  X,
  RefreshCw,
  Edit2,
  Copy,
  Clipboard,
  Bookmark
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useRibbonStore } from '../../store/ribbonStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useFileHistoryStore, PinnedItem, OpenedFileRecord } from '../../store/fileHistoryStore';
import { useRuntimeBridge } from '../../adapters';
import { safePersist } from '../../services/storageHelper';
import { openDocumentWithLargeDocCheck } from '../../services/largeDocHelper';
import { BridgeDirectoryEntry } from '../../ui-contract/bridgeContract';
import { VirtualFile, SupportedLanguage } from '../../../contracts/data_shapes';
import { validateVirtualFile } from '../../contracts/boundarySchemas';


const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return 'Just now';
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return `${days}d ago`;
};

export function validateFilename(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Filename cannot be empty' };
  }
  if (trimmed.length > 255) {
    return { valid: false, error: 'Filename exceeds maximum length of 255 characters' };
  }
  if (trimmed.includes('..') || trimmed === '.' || trimmed === '..') {
    return { valid: false, error: 'Directory traversal sequence ".." is not allowed in filename' };
  }
  // eslint-disable-next-line no-control-regex
  if (/[<>:"/\\|?*\x00-\x1F]/.test(trimmed)) {
    return { valid: false, error: 'Filename contains illegal characters (< > : " / \\ | ? *)' };
  }
  if (/[. ]$/.test(name) || trimmed.endsWith('.')) {
    return { valid: false, error: 'Filename cannot end with a period or space' };
  }
  const baseName = trimmed.split('.')[0].toUpperCase();
  const reservedPattern = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedPattern.test(baseName)) {
    return { valid: false, error: `"${baseName}" is a reserved system device name` };
  }
  return { valid: true };
}

export const findFileInTree = (tree: VirtualFile[], name: string): VirtualFile | null => {
  for (const item of tree) {
    if (item.type === 'file' && item.name === name) return item;
    if (item.type === 'folder' && item.children) {
      const found = findFileInTree(item.children, name);
      if (found) return found;
    }
  }
  return null;
};

export const findFolderInTree = (tree: VirtualFile[], idOrNameOrPath: string): VirtualFile | null => {
  for (const item of tree) {
    if (item.type === 'folder' && (item.id === idOrNameOrPath || item.name === idOrNameOrPath || (item.path && item.path === idOrNameOrPath))) {
      return item;
    }
    if (item.type === 'folder' && item.children) {
      const found = findFolderInTree(item.children, idOrNameOrPath);
      if (found) return found;
    }
  }
  return null;
};

export function computeRelativePath(targetPath?: string | null, workspacePath?: string | null): string {
  if (!targetPath) return '';
  if (!workspacePath) return targetPath;

  const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const normTarget = normalize(targetPath);
  const normWorkspace = normalize(workspacePath);

  if (normTarget.toLowerCase() === normWorkspace.toLowerCase()) {
    return '.';
  }

  const prefix = normWorkspace.toLowerCase() + '/';
  if (normTarget.toLowerCase().startsWith(prefix)) {
    return normTarget.slice(normWorkspace.length + 1);
  }

  return targetPath;
}

export const FileExplorer: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { showConfirm } = useConfirmStore();
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: VirtualFile } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleCloseMenu);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setContextMenu(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('click', handleCloseMenu);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [contextMenu]);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const [saved, storedWorkspace] = await Promise.all([
          bridge.storage.getItem('contextpad_virtual_files'),
          bridge.storage.getItem('contextpad_workspace_path')
        ]);
        if (storedWorkspace) {
          setWorkspacePath(storedWorkspace);
        }
        if (saved) {
          try {
            const rawParsed = JSON.parse(saved);
            if (Array.isArray(rawParsed)) {
              const validated = rawParsed.filter(f => validateVirtualFile(f).success) as VirtualFile[];
              setFiles(validated);
            } else {
              setFiles([]);
            }
          } catch (err: unknown) {
            console.error('[FileExplorer] Failed to parse stored virtual files:', err);
            useNotificationStore.getState().addNotification('File Cache Error', 'Could not parse cached virtual files.', 'warning');
            setFiles([]);
          }
        } else {
          setFiles([]);
        }
      } catch (err: unknown) {
        console.error('[FileExplorer] Failed to load files from storage:', err);
        setFiles([]);
      }
    };

    loadFiles();

    const handleStorageRefresh = () => {
      loadFiles();
    };

    window.addEventListener('storage', handleStorageRefresh);
    window.addEventListener('contextpad_files_updated', handleStorageRefresh);
    return () => {
      window.removeEventListener('storage', handleStorageRefresh);
      window.removeEventListener('contextpad_files_updated', handleStorageRefresh);
    };
  }, [bridge.storage]);

  const activeWorkspacePath = workspacePath || files.find(f => f.type === 'folder' && f.path)?.path || null;

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'folder-specs': true
  });

  const [collapsedSections, setCollapsedSections] = useState<Record<'workspace' | 'pinned' | 'history', boolean>>({
    workspace: false,
    pinned: false,
    history: false
  });

  const toggleSection = (section: 'workspace' | 'pinned' | 'history') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const { createTab, tabs, activeTabId, setActiveTabId } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeFilePath = activeTab?.filePath;
  const activeFileName = activeTab?.title;
  const { 
    pinnedItems, 
    openedHistory, 
    isPinned, 
    togglePinItem, 
    pinItem,
    unpinItem, 
    removeOpenedFile, 
    clearOpenedHistory, 
    recordOpenedFile 
  } = useFileHistoryStore();
  const { addNotification } = useNotificationStore();

  const toggleFolder = async (folderId: string, folderPath?: string) => {
    const willExpand = !expandedFolders[folderId];
    setExpandedFolders(prev => ({ ...prev, [folderId]: willExpand }));

    // If expanding, dynamically check if children need to be loaded from disk
    if (willExpand && bridge.fs.readDirectory) {
      const node = findFolderInTree(files, folderId);
      const targetPath = node?.path || folderPath;

      if (!targetPath) {
        setExpandedFolders(prev => ({ ...prev, [folderId]: false }));
        addNotification('Folder Error', 'Folder path is missing', 'warning');
        return;
      }

      // If node has no loaded children (undefined or empty), fetch them live from disk
      if (!node?.children || node.children.length === 0) {
        try {
          const rawKids = await bridge.fs.readDirectory(targetPath);
          const mapKidsToVirtual = (entries: BridgeDirectoryEntry[]): VirtualFile[] => {
            return entries.map(entry => ({
              id: entry.id || entry.path || `item_${Math.random().toString(36).substr(2, 7)}`,
              name: entry.name,
              type: entry.type,
              content: entry.content,
              language: entry.language,
              path: entry.path,
              children: entry.children ? mapKidsToVirtual(entry.children) : undefined
            }));
          };

          const mappedKids = rawKids ? mapKidsToVirtual(rawKids) : [];
          const updateTreeRecursively = (list: VirtualFile[]): VirtualFile[] => {
            return list.map(item => {
              if (item.id === folderId || (item.path && item.path === targetPath)) {
                return { ...item, children: mappedKids };
              }
              if (item.children) {
                return { ...item, children: updateTreeRecursively(item.children) };
              }
              return item;
            });
          };

          const updated = updateTreeRecursively(files);
          setFiles(updated);
          safePersist(bridge.storage, 'contextpad_virtual_files', JSON.stringify(updated), 'workspace files');
        } catch (err) {
          console.warn('[FileExplorer] Could not read subfolder:', targetPath, err);
          setExpandedFolders(prev => ({ ...prev, [folderId]: false }));
          addNotification('Error Opening Folder', `Could not read directory: ${targetPath}`, 'error');
        }
      }
    }
  };

  const handleOpenFile = async (file: { id?: string; name: string; content?: string; language?: string; path?: string | null }) => {
    let fileContent = file.content;
    if (fileContent === undefined && file.path && bridge.fs.readFile) {
      try {
        const diskContent = await bridge.fs.readFile(file.path);
        if (diskContent !== null && diskContent !== undefined) {
          fileContent = diskContent;
        } else {
          addNotification('File Error', `Unable to read content of ${file.name}`, 'error');
          return;
        }
      } catch (err) {
        console.warn('Could not read file from disk:', err);
        addNotification('File Error', `Failed to read ${file.name}: ${err instanceof Error ? err.message : String(err)}`, 'error');
        return;
      }
    }

    const existing = tabs.find(t => (file.path && t.filePath === file.path) || t.title === file.name);
    if (existing) {
      if (fileContent !== undefined && existing.content !== fileContent && !existing.isDirty) {
        openDocumentWithLargeDocCheck({
          title: file.name,
          content: fileContent,
          language: (file.language as SupportedLanguage) || 'markdown',
          filePath: file.path,
          existingTabId: existing.id
        });
      }
      setActiveTabId(existing.id);
    } else {
      openDocumentWithLargeDocCheck({
        title: file.name,
        content: fileContent || '',
        language: (file.language as SupportedLanguage) || 'markdown',
        filePath: file.path
      });
    }
    recordOpenedFile({
      id: file.id || file.path || file.name,
      name: file.name,
      type: 'file',
      path: file.path,
      language: file.language || 'markdown',
      content: fileContent
    });
  };

  const handleOpenPinnedItem = (item: PinnedItem) => {
    if (item.type === 'folder') {
      const target = findFolderInTree(files, item.id) || findFolderInTree(files, item.name) || (item.path ? findFolderInTree(files, item.path) : null);
      const folderId = target?.id || item.id;
      const folderPath = target?.path || item.path;
      toggleFolder(folderId, folderPath);
      setCollapsedSections(prev => ({ ...prev, workspace: false }));
      addNotification('Folder', `Toggled "${item.name}" in workspace tree`, 'info');
      return;
    }

    // Pinned file
    const matchedVirtual = findFileInTree(files, item.name);
    handleOpenFile({
      id: item.id,
      name: item.name,
      content: matchedVirtual?.content || item.content,
      language: matchedVirtual?.language || item.language || 'markdown',
      path: item.path
    });
  };

  const handleOpenHistoryItem = (historyItem: OpenedFileRecord) => {
    if (historyItem.type === 'folder') {
      const target = findFolderInTree(files, historyItem.id) || findFolderInTree(files, historyItem.name) || (historyItem.path ? findFolderInTree(files, historyItem.path) : null);
      const targetId = target ? target.id : historyItem.id;
      const targetPath = target?.path || historyItem.path;

      // Toggle expanded state and load from disk if needed
      toggleFolder(targetId, targetPath);

      // Ensure workspace files section is expanded
      setCollapsedSections(prev => ({ ...prev, workspace: false }));

      // Bring to top of history
      recordOpenedFile({
        id: targetId,
        name: historyItem.name,
        type: 'folder',
        path: targetPath
      });

      addNotification('Folder', `Toggled "${historyItem.name}" in workspace tree`, 'info');
      return;
    }

    const matchedVirtual = findFileInTree(files, historyItem.name);
    handleOpenFile({
      id: historyItem.id,
      name: historyItem.name,
      content: matchedVirtual?.content || historyItem.content,
      language: matchedVirtual?.language || historyItem.language || 'markdown',
      path: historyItem.path
    });
  };

  const handleTogglePin = (item: PinnedItem) => {
    const currentlyPinned = isPinned(item.id) || isPinned(item.name);
    togglePinItem(item);
    if (currentlyPinned) {
      addNotification('Unpinned', item.name, 'info');
    } else {
      addNotification('Pinned', `"${item.name}" added to quick access`, 'success');
    }
  };

  const getRootWorkspaceDir = (): string | null => {
    if (workspacePath) return workspacePath;
    for (const f of files) {
      if (f.path) {
        const match = f.path.match(/^(.*)[/\\][^/\\]+$/);
        if (match) return match[1];
      }
    }
    return null;
  };

  const handleCreateNewFile = (parentFolder?: VirtualFile) => {
    const defaultName = 'new_prompt.md';
    const folderLabel = parentFolder ? ` in "${parentFolder.name}"` : '';
    const rawName = prompt(`Enter new file name${folderLabel}:`, defaultName);
    if (!rawName) return;
    const name = rawName.trim();
    const validation = validateFilename(name);
    if (!validation.valid) {
      addNotification('Invalid Filename', validation.error || 'Please provide a valid filename', 'error');
      return;
    }

    const language = name.endsWith('.json') ? 'json' : name.endsWith('.js') || name.endsWith('.ts') ? 'javascript' : 'markdown';
    const initialContent = `# ${name}\n\n`;

    let targetPath: string | undefined = undefined;
    if (parentFolder?.path) {
      const sep = parentFolder.path.includes('\\') ? '\\' : '/';
      targetPath = `${parentFolder.path.replace(/[/\\]+$/, '')}${sep}${name}`;
    } else {
      const rootDir = getRootWorkspaceDir();
      if (rootDir) {
        const sep = rootDir.includes('\\') ? '\\' : '/';
        targetPath = `${rootDir.replace(/[/\\]+$/, '')}${sep}${name}`;
      }
    }

    const newFile: VirtualFile = {
      id: targetPath || `file_${Date.now()}`,
      name,
      type: 'file',
      path: targetPath,
      content: initialContent,
      language
    };

    if (targetPath && bridge.fs.saveFile) {
      bridge.fs.saveFile(targetPath, initialContent).then((success) => {
        if (success) {
          addNotification('File Created', `${name} created on disk`, 'success');
        }
      }).catch((err) => {
        console.warn('[FileExplorer] Could not write new file to disk:', err);
      });
    }

    if (parentFolder) {
      const addRecursively = (list: VirtualFile[]): VirtualFile[] => {
        return list.map(item => {
          if (item.id === parentFolder.id || (item.path && item.path === parentFolder.path)) {
            const currentChildren = item.children || [];
            return { ...item, children: [...currentChildren, newFile] };
          }
          if (item.children) {
            return { ...item, children: addRecursively(item.children) };
          }
          return item;
        });
      };
      const updated = addRecursively(files);
      setFiles(updated);
      safePersist(bridge.storage, 'contextpad_virtual_files', JSON.stringify(updated), 'virtual files');
      setExpandedFolders(prev => ({ ...prev, [parentFolder.id]: true }));
    } else {
      const updated = [...files, newFile];
      setFiles(updated);
      safePersist(bridge.storage, 'contextpad_virtual_files', JSON.stringify(updated), 'virtual files');
    }

    handleOpenFile(newFile);
    addNotification('File Created', name, 'success');
  };

  const handleNativeOpenFile = async () => {
    try {
      const file = await bridge.fs.openFile();
      if (file) {
        handleOpenFile({
          name: file.name,
          content: file.content,
          language: (file.language as SupportedLanguage) || 'markdown',
          path: file.path
        });
        addNotification('File Opened', file.name, 'success');
      }
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string } | undefined;
      if (err?.name !== 'AbortError') {
        addNotification('Could not open file', err?.message || 'Unknown error', 'error');
      }
    }
  };

  const handleNativeOpenFolder = async () => {
    try {
      if (!bridge.fs.openDirectory) {
        addNotification('Folder Picker', 'Folder picker is not supported in this runtime environment', 'error');
        return;
      }

      const dirResult = await bridge.fs.openDirectory();
      if (!dirResult) return;

      const folderId = `folder_${Date.now()}_${dirResult.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      // Convert bridge directory entries to VirtualFile format recursively
      const mapEntriesToVirtual = (entries: BridgeDirectoryEntry[]): VirtualFile[] => {
        return entries.map(entry => ({
          id: entry.id || `item_${Math.random().toString(36).substr(2, 7)}`,
          name: entry.name,
          type: entry.type,
          content: entry.content,
          language: entry.language,
          path: entry.path,
          children: entry.children ? mapEntriesToVirtual(entry.children) : undefined
        }));
      };

      const newFolder: VirtualFile = {
        id: folderId,
        name: dirResult.name,
        type: 'folder',
        path: dirResult.path,
        children: mapEntriesToVirtual(dirResult.entries)
      };

      // Replace the entire workspace with the newly selected folder (single workspace at a time)
      const updated = [newFolder];
      setFiles(updated);
      safePersist(bridge.storage, 'contextpad_virtual_files', JSON.stringify(updated), 'workspace files');

      // Automatically expand this workspace folder and clear stale expanded state
      setExpandedFolders({ [folderId]: true });

      // Ensure workspace section itself is visible/expanded
      setCollapsedSections(prev => ({
        ...prev,
        workspace: false
      }));

      setWorkspacePath(dirResult.path);
      safePersist(bridge.storage, 'contextpad_workspace_path', dirResult.path, 'workspace path');

      // Add folder to top of opened folders/files history section
      recordOpenedFile({
        id: folderId,
        name: dirResult.name,
        type: 'folder',
        path: dirResult.path
      });

      addNotification('Workspace Opened', `"${dirResult.name}" set as active workspace`, 'success');
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string } | undefined;
      if (err?.name !== 'AbortError') {
        addNotification('Could not open folder', err?.message || 'Unknown error', 'error');
      }
    }
  };

  const handleRemoveWorkspace = (folderId: string, folderName: string) => {
    const updated = files.filter(f => f.id !== folderId);
    setFiles(updated);
    setWorkspacePath(null);
    bridge.storage.removeItem('contextpad_workspace_path');
    safePersist(bridge.storage, 'contextpad_virtual_files', JSON.stringify(updated), 'workspace files');
    setExpandedFolders(prev => {
      const next = { ...prev };
      delete next[folderId];
      return next;
    });
    addNotification('Workspace Closed', `"${folderName}" removed from workspace`, 'info');
  };

  const handleRefreshWorkspace = async () => {
    if (!workspacePath || !bridge.fs.readDirectory) {
      addNotification('Refresh', 'No workspace folder is currently open', 'info');
      return;
    }
    try {
      const rawEntries = await bridge.fs.readDirectory(workspacePath);
      if (rawEntries) {
        const mapKidsToVirtual = (entries: BridgeDirectoryEntry[]): VirtualFile[] => {
          return entries.map(entry => ({
            id: entry.id || entry.path || `item_${Math.random().toString(36).substr(2, 7)}`,
            name: entry.name,
            type: entry.type,
            content: entry.content,
            language: entry.language,
            path: entry.path,
            children: entry.children ? mapKidsToVirtual(entry.children) : undefined
          }));
        };
        const updated = mapKidsToVirtual(rawEntries);
        setFiles(updated);
        safePersist(bridge.storage, 'contextpad_virtual_files', JSON.stringify(updated), 'workspace files');
        addNotification('Workspace Refreshed', 'File tree updated from disk', 'info');
      }
    } catch (err) {
      console.warn('Failed to refresh workspace:', err);
      addNotification('Refresh Failed', 'Could not refresh file tree', 'error');
    }
  };

  const handleRenameItem = async (item: VirtualFile) => {
    const currentName = item.name;
    const newName = window.prompt(`Rename "${currentName}" to:`, currentName);
    if (!newName || newName.trim() === currentName) return;
    const validation = validateFilename(newName.trim());
    if (!validation.valid) {
      addNotification('Invalid Filename', validation.error || 'Filename is not allowed', 'warning');
      return;
    }
    const trimmed = newName.trim();
    const updateTreeRecursively = (list: VirtualFile[]): VirtualFile[] => {
      return list.map(node => {
        if (node.id === item.id) {
          const nextPath = node.path ? node.path.replace(/[\\/][^\\/]+$/, `/${trimmed}`) : undefined;
          return { ...node, name: trimmed, path: nextPath };
        }
        if (node.children) {
          return { ...node, children: updateTreeRecursively(node.children) };
        }
        return node;
      });
    };
    const updated = updateTreeRecursively(files);
    setFiles(updated);
    safePersist(bridge.storage, 'contextpad_virtual_files', JSON.stringify(updated), 'workspace files');
    const openTab = tabs.find(t => (item.path && t.filePath === item.path) || t.title === currentName);
    if (openTab) {
      useTabStore.getState().updateTabMetadata(openTab.id, { title: trimmed });
    }
    addNotification('Renamed', `Renamed "${currentName}" to "${trimmed}"`, 'success');
  };

  const handleDeleteItem = (item: VirtualFile) => {
    const isFolder = item.type === 'folder';
    showConfirm({
      title: `Delete ${isFolder ? 'Folder' : 'File'}`,
      message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        if (item.path && bridge.deleteFile) {
          try {
            const success = await bridge.deleteFile(item.path);
            if (!success) {
              addNotification('Delete Failed', `Could not delete "${item.name}" from disk.`, 'error');
              return;
            }
          } catch (e) {
            console.warn('Native delete error:', e);
            addNotification('Delete Error', `Failed to delete "${item.name}": ${e instanceof Error ? e.message : String(e)}`, 'error');
            return;
          }
        }
        const removeRecursively = (list: VirtualFile[]): VirtualFile[] => {
          return list
            .filter(node => node.id !== item.id)
            .map(node => node.children ? { ...node, children: removeRecursively(node.children) } : node);
        };
        const updated = removeRecursively(files);
        setFiles(updated);
        safePersist(bridge.storage, 'contextpad_virtual_files', JSON.stringify(updated), 'workspace files');
        const openTab = tabs.find(t => (item.path && t.filePath === item.path) || t.title === item.name);
        if (openTab) {
          useTabStore.getState().closeTab(openTab.id, true);
        }
        addNotification('Deleted', `Deleted "${item.name}"`, 'info');
      }
    });
  };

  const handleCopyPath = (path: string, type: 'relative' | 'absolute') => {
    const textToCopy = type === 'relative' 
      ? computeRelativePath(path, workspacePath) || path
      : path;
    bridge.clipboard.writeText(textToCopy);
    addNotification('Path Copied', `${type === 'relative' ? 'Relative' : 'Absolute'} path copied to clipboard`, 'info');
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: VirtualFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  return (
    <div className="theme-sidebar flex flex-col h-full text-xs select-none">
      {/* Header controls */}
      <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex justify-between items-center border-b border-[var(--border-primary)] shrink-0">
        <span>Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCreateNewFile()}
            title="New File"
            aria-label="New File"
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNativeOpenFile}
            title="Open Disk File"
            aria-label="Open Disk File"
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRefreshWorkspace}
            title="Refresh File Tree"
            aria-label="Refresh File Tree"
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNativeOpenFolder}
            title="Open Folder as Workspace"
            aria-label="Open Folder as Workspace"
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--accent-primary)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Explorer Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Section 1: Workspace Files Tree */}
        <div>
          <div className="flex items-center justify-between py-1 px-1 mb-1">
            <button
              onClick={() => toggleSection('workspace')}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group"
              aria-expanded={!collapsedSections.workspace}
              title={collapsedSections.workspace ? "Expand Workspace Files" : "Collapse Workspace Files"}
            >
              {collapsedSections.workspace ? (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              )}
              <span>Workspace Files</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--card-bg)] text-[var(--text-secondary)] font-mono ml-0.5">
                {files.length}
              </span>
            </button>
          </div>

          {!collapsedSections.workspace && (
            <div className="flex flex-col gap-0.5 mt-1">
              {files.length === 0 ? (
                <div className="text-center py-5 px-3 bg-[var(--card-bg)]/40 rounded-lg border border-dashed border-[var(--border-subtle)] my-1">
                  <Folder className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium mb-0.5">No Workspace Opened</p>
                  <p className="text-[10px] text-[var(--text-muted)] mb-3">Open a folder or file to explore project files</p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={handleNativeOpenFolder}
                      className="px-2.5 py-1.5 bg-[var(--accent-primary)] text-white text-[11px] font-medium rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Open Folder</span>
                    </button>
                    <button
                      onClick={handleNativeOpenFile}
                      className="px-2.5 py-1 bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-[10px] font-medium rounded hover:bg-[var(--card-hover-bg)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Open File</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {files.map(item => (
                    <FileTreeNode
                      key={item.id}
                      item={item}
                      activeFileName={activeFileName}
                      activeFilePath={activeFilePath}
                      expandedFolders={expandedFolders}
                      toggleFolder={toggleFolder}
                      onOpenFile={handleOpenFile}
                      isPinned={isPinned}
                      onTogglePin={handleTogglePin}
                      isRoot={true}
                      onRemoveWorkspace={handleRemoveWorkspace}
                      onContextMenu={handleItemContextMenu}
                      onCreateFileInFolder={handleCreateNewFile}
                    />
                  ))}
                  <button
                    onClick={() => handleCreateNewFile(undefined)}
                    className="flex items-center gap-1.5 py-1.5 px-2 text-[10.5px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors cursor-pointer w-full text-left font-medium mt-1 group border-t border-[var(--border-subtle)]"
                    title="Create new file in workspace root"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] shrink-0" />
                    <span>+ New file</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Pinned Files / Folders (Quick Access) */}
        <div className="border-t border-[var(--border-primary)] pt-2.5 px-1">
          <div className="flex items-center justify-between py-1 px-1 mb-1">
            <button
              onClick={() => toggleSection('pinned')}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group"
              aria-expanded={!collapsedSections.pinned}
              title={collapsedSections.pinned ? "Expand Pinned Files / Folders" : "Collapse Pinned Files / Folders"}
            >
              {collapsedSections.pinned ? (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              )}
              <Pin className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>Pinned Files / Folders</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--card-hover-bg)] text-[var(--text-secondary)] font-mono ml-0.5">
                {pinnedItems.length}
              </span>
            </button>
          </div>

          {!collapsedSections.pinned && (
            <div>
              {pinnedItems.length === 0 ? (
                <div className="text-[11px] text-[var(--text-muted)] italic px-2 py-2 flex items-center gap-1.5 opacity-75">
                  <Pin className="w-3 h-3 shrink-0" />
                  <span>Hover over any file or folder to pin it</span>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 mt-1">
                  {pinnedItems.map(item => {
                    const isFolder = item.type === 'folder';
                    const isActive = !isFolder && ((item.path && activeFilePath) ? item.path === activeFilePath : activeFileName === item.name);
                    const strokeColor = getFileIconColor(item.name);
                    const relativePath = computeRelativePath(item.path, activeWorkspacePath);
                    const tooltipText = relativePath
                      ? (relativePath === '.' ? `Workspace Root (.)` : relativePath)
                      : (item.path || item.name);
                    const ariaLabel = `${item.name}, ${isFolder ? 'folder' : 'file'}, path: ${tooltipText}`;

                    return (
                      <div
                        key={item.id || item.name}
                        onClick={() => handleOpenPinnedItem(item)}
                        title={tooltipText}
                        aria-label={ariaLabel}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenPinnedItem(item);
                          }
                        }}
                        className={`group/pin relative text-xs flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isFolder ? (
                          <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.5" className="shrink-0">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}

                        <span className="truncate flex-1 pr-6" title={tooltipText}>{item.name}</span>

                        {isFolder && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] mr-6">
                            Folder
                          </span>
                        )}

                        {/* Explicit Unpin Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unpinItem(item.id || item.name);
                            addNotification('Unpinned', item.name, 'info');
                          }}
                          title={`Unpin ${item.name}`}
                          aria-label={`Unpin ${item.name}`}
                          className="absolute right-1 p-1 text-[var(--accent-primary)] hover:text-red-400 hover:bg-[var(--card-hover-bg)] rounded transition-colors cursor-pointer"
                        >
                          <PinOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Opened Folders / Files History */}
        <div className="border-t border-[var(--border-primary)] pt-2.5 px-1">
          <div className="flex items-center justify-between py-1 px-1 mb-1">
            <button
              onClick={() => toggleSection('history')}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group"
              aria-expanded={!collapsedSections.history}
              title={collapsedSections.history ? "Expand Opened Folders / Files History" : "Collapse Opened Folders / Files History"}
            >
              {collapsedSections.history ? (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              )}
              <History className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>Opened Folders / Files History</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--card-hover-bg)] text-[var(--text-secondary)] font-mono ml-0.5">
                {openedHistory.length}
              </span>
            </button>

            {openedHistory.length > 0 && !collapsedSections.history && (
              <button
                onClick={() => {
                  clearOpenedHistory();
                  addNotification('History Cleared', 'Opened history was cleared', 'info');
                }}
                title="Clear history"
                aria-label="Clear history"
                className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-red-400 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {!collapsedSections.history && (
            <div>
              {openedHistory.length === 0 ? (
                <div className="text-[11px] text-[var(--text-muted)] italic px-2 py-2 flex items-center gap-1.5 opacity-75">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>No opened files or folders yet</span>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 mt-1">
                  {openedHistory.map(record => {
                    const isFolder = record.type === 'folder';
                    const isActive = !isFolder && ((record.path && activeFilePath) ? record.path === activeFilePath : activeFileName === record.name);
                    const strokeColor = getFileIconColor(record.name);
                    const pinned = isPinned(record.id) || isPinned(record.name);
                    const relativePath = computeRelativePath(record.path, activeWorkspacePath);
                    const tooltipText = relativePath
                      ? (relativePath === '.' ? `Workspace Root (.)` : relativePath)
                      : (record.path || record.name);
                    const ariaLabel = `${record.name}, ${isFolder ? 'folder' : 'file'}, relative path: ${tooltipText}`;

                    return (
                      <div
                        key={record.id}
                        onClick={() => handleOpenHistoryItem(record)}
                        title={tooltipText}
                        aria-label={ariaLabel}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenHistoryItem(record);
                          }
                        }}
                        className={`group/hist relative text-xs flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isFolder ? (
                          <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.5" className="shrink-0">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}

                        <div className="flex flex-col min-w-0 flex-1 pr-14">
                          <span className="truncate text-xs font-medium" title={tooltipText}>{record.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)] opacity-70 truncate flex items-center gap-1" title={tooltipText}>
                            {isFolder && <span className="font-semibold text-[9px] uppercase tracking-wider text-[var(--accent-primary)]">Folder ·</span>}
                            {relativePath && relativePath !== '.' && relativePath !== record.name && (
                              <span className="truncate max-w-[130px] font-mono text-[9px] text-[var(--text-secondary)] opacity-80" title={tooltipText}>
                                {relativePath.includes('/') ? relativePath.slice(0, relativePath.lastIndexOf('/') + 1) : ''}
                              </span>
                            )}
                            <span>{formatRelativeTime(record.openedAt)}</span>
                          </span>
                        </div>

                        {/* Explicit Pin/Unpin button and remove button */}
                        <div className="absolute right-1 flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin({
                                id: record.id,
                                name: record.name,
                                type: record.type,
                                path: record.path || undefined,
                                language: record.language
                              });
                            }}
                            title={pinned ? `Unpin "${record.name}"` : `Pin "${record.name}" to quick access`}
                            aria-label={pinned ? `Unpin "${record.name}"` : `Pin "${record.name}" to quick access`}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              pinned 
                                ? 'text-[var(--accent-primary)] hover:text-red-400 hover:bg-[var(--accent-container)]' 
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                            }`}
                          >
                            {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeOpenedFile(record.id);
                            }}
                            title="Remove from history"
                            aria-label="Remove from history"
                            className="p-1 text-[var(--text-muted)] hover:text-red-400 opacity-60 group-hover/hist:opacity-100 hover:bg-[var(--card-hover-bg)] rounded transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="p-2 px-3 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] text-[10px] text-[var(--text-muted)] flex items-center justify-between shrink-0">
        <span>Workspace Files</span>
        <span className="text-[var(--status-success)] font-medium">● Synced</span>
      </div>

      {/* Context Menu Popup */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[var(--card-bg)] border border-[var(--border-primary)] rounded shadow-xl py-1 w-48 text-xs text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 220), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item.type === 'file' && (
            <>
              <button
                onClick={() => {
                  handleOpenFile(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
              >
                <span>Open File</span>
              </button>
              <button
                onClick={() => {
                  const file = contextMenu.item;
                  useRibbonStore.getState().addItem({
                    label: file.name,
                    icon: 'Bookmark',
                    color: 'amber',
                    type: 'file',
                    targetId: file.path || file.name,
                    tooltip: `File Bookmark: ${file.path || file.name}`,
                    enabled: true,
                    showLabel: false
                  });
                  useNotificationStore.getState().addNotification('Ribbon Pin', `Pinned "${file.name}" to ribbon`, 'success');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Pin to Ribbon</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              const itm = contextMenu.item;
              setContextMenu(null);
              handleRenameItem(itm);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Rename</span>
          </button>

          <button
            onClick={() => {
              const itm = contextMenu.item;
              handleTogglePin({
                id: itm.id,
                name: itm.name,
                type: itm.type === 'directory' ? 'folder' : itm.type,
                path: itm.path,
                content: itm.content,
                language: itm.language
              });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
          >
            {isPinned(contextMenu.item.id) || isPinned(contextMenu.item.name) ? (
              <>
                <PinOff className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Unpin from Quick Access</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Pin to Quick Access</span>
              </>
            )}
          </button>

          {contextMenu.item.path && (
            <>
              <div className="my-1 border-t border-[var(--border-subtle)]" />
              <button
                onClick={() => {
                  handleCopyPath(contextMenu.item.path!, 'relative');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Copy Relative Path</span>
              </button>
              <button
                onClick={() => {
                  handleCopyPath(contextMenu.item.path!, 'absolute');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Copy Full Path</span>
              </button>
              {bridge.openFileExplorer && (
                <button
                  onClick={() => {
                    bridge.openFileExplorer(contextMenu.item.path!);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span>Reveal in File Explorer</span>
                </button>
              )}
            </>
          )}

          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <button
            onClick={() => {
              const itm = contextMenu.item;
              setContextMenu(null);
              handleDeleteItem(itm);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 text-red-400 flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
          </button>
        </div>
      )}
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
  activeFilePath?: string | null;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (id: string, path?: string) => void;
  onOpenFile: (file: VirtualFile) => void;
  isPinned: (idOrName: string) => boolean;
  onTogglePin: (item: PinnedItem) => void;
  isRoot?: boolean;
  onRemoveWorkspace?: (id: string, name: string) => void;
  onContextMenu?: (e: React.MouseEvent, item: VirtualFile) => void;
  onCreateFileInFolder?: (folder: VirtualFile) => void;
}> = ({ item, activeFileName, activeFilePath, expandedFolders, toggleFolder, onOpenFile, isPinned, onTogglePin, isRoot, onRemoveWorkspace, onContextMenu, onCreateFileInFolder }) => {
  const pinned = isPinned(item.id) || isPinned(item.name);

  if (item.type === 'folder') {
    const isExpanded = !!expandedFolders[item.id];
    return (
      <div>
        <div 
          className="group/folder relative flex items-center"
          onContextMenu={(e) => onContextMenu?.(e, item)}
        >
          <button
            onClick={() => toggleFolder(item.id, item.path)}
            className={`w-full flex items-center gap-1.5 p-1.5 hover:bg-[var(--card-hover-bg)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer ${isRoot ? 'pr-14' : 'pr-7'}`}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />}
            <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            <span className="truncate font-medium text-xs text-[var(--text-primary)] flex-1">{item.name}</span>
          </button>
          <div className="absolute right-1 flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin({ id: item.id, name: item.name, type: 'folder', path: item.path });
              }}
              title={pinned ? "Unpin folder" : "Pin folder to quick access"}
              aria-label={pinned ? "Unpin folder" : "Pin folder to quick access"}
              className={`p-1 rounded transition-all cursor-pointer ${
                pinned 
                  ? 'text-[var(--accent-primary)] opacity-100 hover:bg-[var(--accent-container)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover/folder:opacity-100 hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>
            {isRoot && onRemoveWorkspace && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveWorkspace(item.id, item.name);
                }}
                title={`Close workspace "${item.name}"`}
                aria-label={`Close workspace "${item.name}"`}
                className="p-1 text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover/folder:opacity-100 hover:bg-[var(--card-hover-bg)] rounded transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Nested folders: clicking any nested folder expands or collapses it recursively */}
        {isExpanded && (
          <div className="pl-3 border-l border-[var(--border-primary)] ml-2 my-0.5 space-y-0.5">
            {item.children && item.children.length > 0 ? (
              <>
                {item.children.map(child => (
                  <FileTreeNode
                    key={child.id}
                    item={child}
                    activeFileName={activeFileName}
                    activeFilePath={activeFilePath}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    onOpenFile={onOpenFile}
                    isPinned={isPinned}
                    onTogglePin={onTogglePin}
                    onContextMenu={onContextMenu}
                    onCreateFileInFolder={onCreateFileInFolder}
                  />
                ))}
                {onCreateFileInFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateFileInFolder(item);
                    }}
                    className="flex items-center gap-1.5 py-1 px-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors cursor-pointer w-full text-left font-medium group mt-0.5"
                    title={`Create new file inside "${item.name}"`}
                  >
                    <FilePlus className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] shrink-0" />
                    <span>+ New file</span>
                  </button>
                )}
              </>
            ) : item.children === undefined ? (
              <div className="text-[10px] text-[var(--text-muted)] italic py-1 px-1.5 flex items-center gap-1.5 opacity-70 select-none">
                <span className="w-2.5 h-2.5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></span>
                <span>Loading...</span>
              </div>
            ) : (
              <div className="py-0.5 space-y-0.5">
                <div className="text-[10px] text-[var(--text-muted)] italic py-0.5 px-1.5 select-none">
                  (empty folder)
                </div>
                {onCreateFileInFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateFileInFolder(item);
                    }}
                    className="flex items-center gap-1.5 py-1 px-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors cursor-pointer w-full text-left font-medium group"
                    title={`Create new file inside "${item.name}"`}
                  >
                    <FilePlus className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] shrink-0" />
                    <span>+ New file</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const isActive = (item.path && activeFilePath) 
    ? item.path === activeFilePath 
    : activeFileName === item.name;
  const strokeColor = getFileIconColor(item.name);

  return (
    <div
      onClick={() => onOpenFile(item)}
      onContextMenu={(e) => onContextMenu?.(e, item)}
      className={`group/node relative text-xs flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
        isActive 
          ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.5" className="shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="truncate flex-1 pr-6">{item.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin({
            id: item.id,
            name: item.name,
            type: 'file',
            content: item.content,
            language: item.language
          });
        }}
        title={pinned ? "Unpin file" : "Pin file to quick access"}
        aria-label={pinned ? "Unpin file" : "Pin file to quick access"}
        className={`absolute right-1 p-1 rounded transition-all cursor-pointer ${
          pinned 
            ? 'text-[var(--accent-primary)] opacity-100 hover:bg-[var(--accent-container)]' 
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover/node:opacity-100 hover:bg-[var(--card-hover-bg)]'
        }`}
      >
        {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
      </button>
    </div>
  );
};
