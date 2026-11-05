/**
 * Host Command Bus (FG-16)
 *
 * Headless execution router handling incoming RPC requests from sandboxed
 * panel mini-apps, mediating between sandboxed iframes and CNTXT host stores.
 */

import {
  CntxtRpcRequest,
  CntxtRpcResponse,
  EditorActiveDocumentResult,
  TabSummaryResult,
  WorkspaceInfoResult,
  SupportedLanguage,
} from '../../../contracts/data_shapes';
import {
  validateRpcRequest,
  validateEditorInsert,
  validateTabCreate,
  validateWorkspaceReadFile,
  validateWorkspaceWriteFile,
  validateTemplateApply,
  validateActionExecute,
  validateNotify,
  validateTerminalSpawn,
  validateTerminalSendInput,
  validateTerminalKill,
  validateEditorSetSelections,
  validateEditorFold,
  validateEditorReplaceRange,
  validateEditorSetDiagnostics,
  validateBlocksList,
  validateBlocksGet,
  validateBlocksUpsert,
  validateBlocksUpdateParams,
  validateBlocksRemove,
  validateDirectivesGet
} from '../../../contracts/boundarySchemas';
import {
  parseCntxtDocument,
  upsertBlock,
  updateBlockParams,
  removeBlock,
  prependDeliverableToThread,
  promoteToCntxtExtension,
  hasCntxtPipeBlock,
} from '../../../services/editor/cntxtBlockParser';
import { useTabStore } from '../../../store/tabStore';
import { useTerminalStore } from '../../../store/terminalStore';
import { useActionStore } from '../../../store/actionStore';
import { useTemplateStore } from '../../../store/templateStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { editorRegistry } from '../../../services/editor/editorRegistry';
import { executeActionById } from '../../../services/actionExecutor';
import { processTemplateVariables } from '../../../services/editor/templateVariableService';
import { IRuntimeBridge, BridgeDirectoryEntry } from '../../../ui-contract/bridgeContract';
import {
  getCapabilitiesManifest,
  getAgentDirectives,
  getRawMarkdownGuide,
} from '../../../services/agentDirectivesService';

/**
 * Normalizes slash direction to standard POSIX-style forward slashes.
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

/**
 * Resolves whether a path safely resides inside the designated root directory.
 */
export function isPathInsideRoot(rootPath: string, targetPath: string): boolean {
  const normRoot = normalizePath(rootPath).toLowerCase();
  const normTarget = normalizePath(targetPath).toLowerCase();
  return normTarget === normRoot || normTarget.startsWith(normRoot + '/');
}

export type RpcDomainHandler = (action: string, payload: unknown, appId?: string) => Promise<unknown>;

export class HostCommandBus {
  private domainHandlers = new Map<string, RpcDomainHandler>();

  constructor(private bridge: IRuntimeBridge) {
    this.registerDomain('editor', (action, payload) => this.handleEditorDomain(action, payload));
    this.registerDomain('tabs', (action, payload) => this.handleTabsDomain(action, payload));
    this.registerDomain('workspace', (action, payload) => this.handleWorkspaceDomain(action, payload));
    this.registerDomain('templates', (action, payload) => this.handleTemplatesDomain(action, payload));
    this.registerDomain('actions', (action, payload) => this.handleActionsDomain(action, payload));
    this.registerDomain('notify', (action, payload) => this.handleNotifyDomain(action, payload));
    this.registerDomain('terminal', (action, payload) => this.handleTerminalDomain(action, payload));
    this.registerDomain('blocks', (action, payload, appId) => this.handleBlocksDomain(action, payload, appId));
    this.registerDomain('directives', (action, payload) => this.handleDirectivesDomain(action, payload));
  }

  /**
   * Dynamically registers or overrides an RPC domain handler (Pillar 4 Extensibility).
   */
  public registerDomain(domain: string, handler: RpcDomainHandler): void {
    this.domainHandlers.set(domain, handler);
  }

  /**
   * Dispatches a raw RPC request payload and returns a typed RPC response.
   */
  async handleRequest(rawRequest: unknown): Promise<CntxtRpcResponse> {
    const parseResult = validateRpcRequest(rawRequest);
    if (!parseResult.success) {
      return {
        id: typeof (rawRequest as Record<string, unknown>)?.id === 'string'
          ? ((rawRequest as Record<string, unknown>).id as string)
          : 'unknown',
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.message,
        },
      };
    }

    const request = parseResult.data;

    try {
      const data = await this.executeDomainAction(request);
      return {
        id: request.id,
        success: true,
        data,
      };
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      return {
        id: request.id,
        success: false,
        error: {
          code: (errorObj.code as CntxtRpcResponse['error']['code']) || 'EXECUTION_ERROR',
          message: errorObj.message || String(err),
        },
      };
    }
  }

  private async executeDomainAction(request: CntxtRpcRequest): Promise<unknown> {
    const { domain, action, payload, appId } = request;
    const handler = this.domainHandlers.get(domain);
    if (!handler) {
      throw { code: 'NOT_FOUND', message: `Unknown domain: ${domain}` };
    }
    return handler(action, payload, appId);
  }

  // ==========================================
  // Editor Domain
  // ==========================================

  private async handleEditorDomain(action: string, payload: unknown): Promise<unknown> {
    const tabStore = useTabStore.getState();
    const activeTabId = tabStore.activeTabId;

    switch (action) {
      case 'getSelection': {
        if (!activeTabId) return '';
        const viewSelection = editorRegistry.getSelectedText(activeTabId);
        if (viewSelection) return viewSelection;

        // Fallback: Check tab store cached selection indices
        const tab = tabStore.tabs.find((t) => t.id === activeTabId);
        if (tab && typeof tab.selectionFrom === 'number' && typeof tab.selectionTo === 'number') {
          if (tab.selectionFrom !== tab.selectionTo) {
            return tab.content.slice(
              Math.min(tab.selectionFrom, tab.selectionTo),
              Math.max(tab.selectionFrom, tab.selectionTo)
            );
          }
        }
        return '';
      }

      case 'insert': {
        const validated = validateEditorInsert(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        const { text, mode = 'cursor' } = validated.data;
        if (!activeTabId) {
          throw { code: 'NOT_FOUND', message: 'No active editor tab to insert into' };
        }

        if (mode === 'append') {
          const tab = tabStore.tabs.find((t) => t.id === activeTabId);
          if (tab) {
            tabStore.updateTabContent(activeTabId, tab.content + text, true);
            editorRegistry.setContent(activeTabId, tab.content + text);
          }
        } else if (mode === 'replace') {
          const success = editorRegistry.replaceSelection(activeTabId, text);
          if (!success) {
            tabStore.insertTextAtCursor(activeTabId, text, true);
          }
        } else {
          // Default: cursor insert
          const success = editorRegistry.insertTextAtCursor(activeTabId, text, false);
          if (!success) {
            tabStore.insertTextAtCursor(activeTabId, text, false);
          }
        }
        return { inserted: true };
      }

      case 'getActiveDocument': {
        if (!activeTabId) return null;
        const tab = tabStore.tabs.find((t) => t.id === activeTabId);
        if (!tab) return null;

        const liveDoc = editorRegistry.getView(activeTabId)?.state.doc.toString() ?? tab.content;
        const result: EditorActiveDocumentResult = {
          title: tab.title,
          content: liveDoc,
          language: tab.language,
          filePath: tab.filePath ?? undefined,
          isDirty: tab.isDirty,
        };
        return result;
      }

      case 'setSelections': {
        const validated = validateEditorSetSelections(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        if (!activeTabId) {
          throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        }
        const ok = editorRegistry.setSelections(
          activeTabId,
          validated.data.selections,
          validated.data.mainIndex
        );
        return { success: ok };
      }

      case 'getSelections': {
        if (!activeTabId) return [];
        return editorRegistry.getSelections(activeTabId);
      }

      case 'fold': {
        const validated = validateEditorFold(payload || {});
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        if (!activeTabId) {
          throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        }
        const ok = editorRegistry.fold(activeTabId, validated.data);
        return { success: ok };
      }

      case 'foldRange': {
        if (!activeTabId) throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        const p = (payload || {}) as { line?: number };
        const ok = editorRegistry.fold(activeTabId, { line: p.line, unfold: false });
        return { success: ok };
      }

      case 'unfoldRange': {
        if (!activeTabId) throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        const p = (payload || {}) as { line?: number };
        const ok = editorRegistry.fold(activeTabId, { line: p.line, unfold: true });
        return { success: ok };
      }

      case 'foldAll': {
        if (!activeTabId) throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        const ok = editorRegistry.fold(activeTabId, { all: true, unfold: false });
        return { success: ok };
      }

      case 'unfoldAll': {
        if (!activeTabId) throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        const ok = editorRegistry.fold(activeTabId, { all: true, unfold: true });
        return { success: ok };
      }

      case 'setDiagnostics': {
        const validated = validateEditorSetDiagnostics(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        if (!activeTabId) {
          throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        }
        const ok = editorRegistry.setDiagnostics(activeTabId, validated.data.diagnostics);
        return { success: ok };
      }

      case 'clearDiagnostics': {
        if (!activeTabId) {
          throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        }
        const ok = editorRegistry.clearDiagnostics(activeTabId);
        return { success: ok };
      }

      case 'replaceRange': {
        const validated = validateEditorReplaceRange(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        if (!activeTabId) {
          throw { code: 'NOT_FOUND', message: 'No active editor tab' };
        }
        const ok = editorRegistry.replaceRange(
          activeTabId,
          validated.data.from,
          validated.data.to,
          validated.data.text
        );
        return { success: ok };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown editor action: ${action}` };
    }
  }

  // ==========================================
  // Tabs Domain
  // ==========================================

  private async handleTabsDomain(action: string, payload: unknown): Promise<unknown> {
    const tabStore = useTabStore.getState();

    switch (action) {
      case 'list': {
        const list: TabSummaryResult[] = tabStore.tabs.map((t) => ({
          id: t.id,
          title: t.title,
          filePath: t.filePath ?? undefined,
          isDirty: t.isDirty,
          language: t.language,
        }));
        return list;
      }

      case 'create': {
        const validated = validateTabCreate(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        const { title, content, language, filePath } = validated.data;

        // Check if an Active Thread tab exists to route deliverables into
        const activeThreadTab = tabStore.tabs.find((t) => t.isActiveThread);
        const incomingIsDeliverable =
          typeof content === 'string' &&
          (hasCntxtPipeBlock(content) || (title && /\.cntxt$/i.test(title)));

        if (activeThreadTab && incomingIsDeliverable && typeof content === 'string') {
          const prepended = prependDeliverableToThread(activeThreadTab.content, content);
          tabStore.updateTabContent(activeThreadTab.id, prepended, true);
          editorRegistry.setContent(activeThreadTab.id, prepended);
          tabStore.setActiveTabId(activeThreadTab.id);
          if (activeThreadTab.filePath) {
            try {
              await this.bridge.fs.saveFile(activeThreadTab.filePath, prepended);
            } catch (err: unknown) {
              console.error(`Failed to save active thread deliverable to disk at "${activeThreadTab.filePath}":`, err);
              useNotificationStore
                .getState()
                .addNotification(
                  'Disk Save Warning',
                  `Deliverable prepended in memory, but saving to "${activeThreadTab.filePath}" failed: ${String(err)}`,
                  'warning'
                );
            }
          }
          useNotificationStore
            .getState()
            .addNotification(
              'Deliverable Prepended',
              `Prepended to active thread "${activeThreadTab.title}"`,
              'info'
            );
          return { tabId: activeThreadTab.id, prependedToActiveThread: true };
        }

        if (filePath) {
          const normPath = normalizePath(filePath).toLowerCase();
          const existing = tabStore.tabs.find((t) => t.filePath && normalizePath(t.filePath).toLowerCase() === normPath);
          if (existing) {
            if (typeof content === 'string' && content.length > 0) {
              tabStore.updateTabContent(existing.id, content, false);
              editorRegistry.setContent(existing.id, content);
            }
            tabStore.setActiveTabId(existing.id);
            return { tabId: existing.id, focused: true, updated: true };
          }
        }
        const isSupportedLang = (l?: string): l is SupportedLanguage =>
          ['markdown', 'javascript', 'typescript', 'python', 'json', 'yaml', 'html', 'css', 'text'].includes(
            l as SupportedLanguage
          );
        const targetLang: SupportedLanguage = isSupportedLang(language) ? language : 'markdown';

        const isCntxt = incomingIsDeliverable || hasCntxtPipeBlock(content || '');
        const finalTitle = isCntxt ? promoteToCntxtExtension(title || 'Deliverable.cntxt') : title;
        const finalPath = isCntxt && filePath ? promoteToCntxtExtension(filePath) : (filePath ?? null);

        const newTabId = tabStore.createTab(
          finalTitle,
          content,
          targetLang,
          finalPath
        );
        return { tabId: newTabId };
      }

      case 'focus': {
        const tabId = (payload as Record<string, unknown>)?.tabId;
        if (typeof tabId !== 'string') {
          throw { code: 'VALIDATION_ERROR', message: 'tabId must be a string' };
        }
        const exists = tabStore.tabs.some((t) => t.id === tabId);
        if (!exists) {
          throw { code: 'NOT_FOUND', message: `Tab ${tabId} not found` };
        }
        tabStore.setActiveTabId(tabId);
        return { focused: true };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown tabs action: ${action}` };
    }
  }

  // ==========================================
  // Workspace Domain
  // ==========================================

  private async handleWorkspaceDomain(action: string, payload: unknown): Promise<unknown> {
    let storedWorkspace = await this.bridge.storage.getItem('contextpad_workspace_path');
    if (!storedWorkspace && this.bridge.fs.getDefaultAppsDir) {
      storedWorkspace = await this.bridge.fs.getDefaultAppsDir();
    }

    switch (action) {
      case 'getInfo': {
        const rootPath = storedWorkspace || '';
        let projectName = 'CNTXT Workspace';
        if (rootPath) {
          const parts = normalizePath(rootPath).split('/');
          projectName = parts[parts.length - 1] || 'CNTXT Workspace';
        }
        const info: WorkspaceInfoResult = {
          rootPath,
          projectName,
          fileCount: 0,
        };
        return info;
      }

      case 'listFiles': {
        if (!storedWorkspace || !this.bridge.fs.readDirectory) {
          return [];
        }

        const filterFolder =
          typeof payload === 'string'
            ? payload.trim().replace(/^[\/\\]+/, '')
            : (payload as Record<string, unknown>)?.folder
            ? String((payload as Record<string, unknown>).folder).trim().replace(/^[\/\\]+/, '')
            : (payload as Record<string, unknown>)?.subpath
            ? String((payload as Record<string, unknown>).subpath).trim().replace(/^[\/\\]+/, '')
            : '';
        const pattern = (payload as Record<string, unknown>)?.pattern;

        try {
          const tree = await this.bridge.fs.readDirectory(storedWorkspace);
          if (!tree) return [];
          const relativePaths: string[] = [];
          const collectFiles = (nodes: BridgeDirectoryEntry[]) => {
            for (const node of nodes) {
              if (node.type === 'folder' && node.children) {
                collectFiles(node.children);
              } else if (node.type === 'file' && node.path) {
                const normTarget = normalizePath(node.path);
                const normRoot = normalizePath(storedWorkspace);
                if (normTarget.startsWith(normRoot)) {
                  const rel = normTarget.slice(normRoot.length).replace(/^\//, '');
                  if (!filterFolder || rel === filterFolder || rel.startsWith(`${filterFolder}/`)) {
                    if (!pattern || new RegExp(String(pattern)).test(rel)) {
                      relativePaths.push(rel);
                    }
                  }
                }
              }
            }
          };
          collectFiles(tree);
          return relativePaths;
        } catch {
          return [];
        }
      }

      case 'readFile': {
        const validated = validateWorkspaceReadFile(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        if (!storedWorkspace) {
          throw { code: 'PERMISSION_DENIED', message: 'No active workspace or default apps directory opened' };
        }

        const { relativePath } = validated.data;
        const cleanRel = relativePath.replace(/^[\/\\]+/, '');
        const targetFullPath = `${storedWorkspace}/${cleanRel}`;

        if (!isPathInsideRoot(storedWorkspace, targetFullPath)) {
          throw { code: 'PATH_TRAVERSAL', message: 'Access denied: Path escapes workspace root' };
        }

        const content = await this.bridge.fs.readFile(targetFullPath);
        if (content === null || content === undefined) {
          throw { code: 'NOT_FOUND', message: `File not found: ${cleanRel}` };
        }
        return { content };
      }

      case 'writeFile': {
        const validated = validateWorkspaceWriteFile(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        if (!storedWorkspace) {
          throw { code: 'PERMISSION_DENIED', message: 'No active workspace or default apps directory opened' };
        }

        const { relativePath, content } = validated.data;
        const cleanRel = relativePath.replace(/^[\/\\]+/, '');
        const targetFullPath = `${storedWorkspace}/${cleanRel}`;

        if (!isPathInsideRoot(storedWorkspace, targetFullPath)) {
          throw { code: 'PATH_TRAVERSAL', message: 'Access denied: Path escapes workspace root' };
        }

        // Dirty Tab Interlock: Check if this file is open and dirty in editor
        const tabStore = useTabStore.getState();
        const normTarget = normalizePath(targetFullPath).toLowerCase();
        const dirtyTab = tabStore.tabs.find((t) => {
          if (!t.filePath) return false;
          const normTab = normalizePath(t.filePath).toLowerCase();
          return (normTab === normTarget || normTab.endsWith(normTarget)) && t.isDirty;
        });

        if (dirtyTab) {
          // Route change to the open tab buffer to prevent clobbering in-flight user edits
          tabStore.updateTabContent(dirtyTab.id, content, true);
          editorRegistry.setContent(dirtyTab.id, content);
          useNotificationStore
            .getState()
            .addNotification(
              'Editor Buffer Updated',
              `Modifications to "${dirtyTab.title}" routed to active tab buffer.`,
              'info'
            );
          return { writtenTo: 'tab_buffer', tabId: dirtyTab.id };
        }

        await this.bridge.fs.saveFile(targetFullPath, content);
        return { writtenTo: 'disk', path: relativePath };
      }

      case 'appendToFile': {
        const validated = validateWorkspaceWriteFile(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        if (!storedWorkspace) {
          throw { code: 'PERMISSION_DENIED', message: 'No active workspace or default apps directory opened' };
        }

        const { relativePath, content } = validated.data;
        const cleanRel = relativePath.replace(/^[\/\\]+/, '');
        const targetFullPath = `${storedWorkspace}/${cleanRel}`;

        if (!isPathInsideRoot(storedWorkspace, targetFullPath)) {
          throw { code: 'PATH_TRAVERSAL', message: 'Access denied: Path escapes workspace root' };
        }

        let existing = '';
        try {
          const current = await this.bridge.fs.readFile(targetFullPath);
          if (current !== null && current !== undefined) existing = current;
        } catch {
          existing = '';
        }

        const sep = (existing && !existing.endsWith('\n')) ? '\n' : '';
        const finalContent = existing + sep + content;

        const tabStore = useTabStore.getState();
        const normTarget = normalizePath(targetFullPath).toLowerCase();
        const dirtyTab = tabStore.tabs.find((t) => {
          if (!t.filePath) return false;
          const normTab = normalizePath(t.filePath).toLowerCase();
          return (normTab === normTarget || normTab.endsWith(normTarget)) && t.isDirty;
        });

        if (dirtyTab) {
          tabStore.updateTabContent(dirtyTab.id, finalContent, true);
          editorRegistry.setContent(dirtyTab.id, finalContent);
          return { writtenTo: 'tab_buffer', tabId: dirtyTab.id };
        }

        await this.bridge.fs.saveFile(targetFullPath, finalContent);
        return { writtenTo: 'disk', path: relativePath };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown workspace action: ${action}` };
    }
  }

  // ==========================================
  // Templates Domain
  // ==========================================

  private async handleTemplatesDomain(action: string, payload: unknown): Promise<unknown> {
    const templateStore = useTemplateStore.getState();

    switch (action) {
      case 'list': {
        return templateStore.templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          variables: t.variables,
        }));
      }

      case 'apply': {
        const validated = validateTemplateApply(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        const { templateId, variables } = validated.data;
        const template = templateStore.templates.find((t) => t.id === templateId);
        if (!template) {
          throw { code: 'NOT_FOUND', message: `Template ${templateId} not found` };
        }

        // 1. Process system macros ({{SELECTION}}, {{DATE}}, etc.)
        const activeTabId = useTabStore.getState().activeTabId;
        const selectedText = activeTabId ? editorRegistry.getSelectedText(activeTabId) : '';
        const systemProcessed = processTemplateVariables(template.content, selectedText);

        // 2. Substitute user variables
        let finalContent = systemProcessed.content;
        for (const [key, val] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          finalContent = finalContent.replace(regex, val);
        }

        return { content: finalContent };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown templates action: ${action}` };
    }
  }

  // ==========================================
  // Actions Domain
  // ==========================================

  private async handleActionsDomain(action: string, payload: unknown): Promise<unknown> {
    const actionStore = useActionStore.getState();

    switch (action) {
      case 'list': {
        return actionStore.actions.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          category: a.category,
          enabled: a.enabled,
        }));
      }

      case 'execute': {
        const validated = validateActionExecute(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        const { actionId } = validated.data;
        const executed = await executeActionById(actionId);
        return { executed };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown actions action: ${action}` };
    }
  }

  // ==========================================
  // Notification Domain
  // ==========================================

  private async handleNotifyDomain(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'show':
      case 'notify': {
        const validated = validateNotify(payload);
        if (!validated.success) {
          throw { code: 'VALIDATION_ERROR', message: validated.error.message };
        }
        const { type, title, message } = validated.data;
        const notifId = useNotificationStore
          .getState()
          .addNotification(title || 'Panel App Notification', message, type);
        return { notificationId: notifId };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown notify action: ${action}` };
    }
  }

  // ==========================================
  // Terminal Domain (FG-17)
  // ==========================================

  private async handleTerminalDomain(action: string, payload: unknown): Promise<unknown> {
    const terminalStore = useTerminalStore.getState();

    switch (action) {
      case 'listChannels': {
        const channels = terminalStore.getChannelList();
        return channels.map((ch) => ({
          id: ch.id,
          name: ch.name,
          status: ch.status,
          exitCode: ch.exitCode,
          cwd: ch.cwd,
        }));
      }

      case 'spawn': {
        const validation = validateTerminalSpawn(payload);
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { id, name, command, args, cwd } = validation.data;
        const channelId = terminalStore.createChannel({
          id,
          name,
          command,
          args,
          cwd,
        });

        if (this.bridge.terminal?.isAvailable()) {
          try {
            terminalStore.setChannelStatus(channelId, 'running');
            await this.bridge.terminal.spawn({
              id: channelId,
              command,
              args,
              cwd,
            });
          } catch (err: unknown) {
            terminalStore.setChannelStatus(channelId, 'error');
            throw { code: 'EXECUTION_ERROR', message: String(err) };
          }
        }
        return { channelId };
      }

      case 'sendInput': {
        const validation = validateTerminalSendInput(payload);
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { channelId, data } = validation.data;
        if (this.bridge.terminal?.isAvailable()) {
          await this.bridge.terminal.write(channelId, data);
        } else {
          terminalStore.appendOutput(channelId, 'stdout', data);
        }
        return { success: true };
      }

      case 'kill': {
        const validation = validateTerminalKill(payload);
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { channelId } = validation.data;
        if (this.bridge.terminal?.isAvailable()) {
          await this.bridge.terminal.kill(channelId);
        }
        terminalStore.setChannelStatus(channelId, 'exited', -1);
        return { success: true };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown terminal action: ${action}` };
    }
  }

  // ==========================================
  // Blocks Domain (FG-22 — CNTXT Pipe Block Orchestration)
  // ==========================================

  private async handleBlocksDomain(action: string, payload: unknown, appId?: string): Promise<unknown> {
    const tabStore = useTabStore.getState();

    const resolveTargetTab = (tabId?: string) => {
      const targetId = tabId || tabStore.activeTabId;
      if (!targetId) {
        throw { code: 'NOT_FOUND', message: 'No active editor tab available' };
      }
      const tab = tabStore.tabs.find((t) => t.id === targetId);
      if (!tab) {
        throw { code: 'NOT_FOUND', message: `Tab not found: ${targetId}` };
      }
      return tab;
    };

    switch (action) {
      case 'list': {
        const validation = validateBlocksList(payload ?? {});
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { tabId, tag, status, onlyCntxt = true } = validation.data;
        const tab = resolveTargetTab(tabId);
        const parsed = parseCntxtDocument(tab.content);

        let filtered = parsed.blocks;
        if (onlyCntxt) {
          filtered = filtered.filter((b) => b.isCNTXT);
        }
        if (tag) {
          filtered = filtered.filter((b) => b.params.tags?.includes(tag));
        }
        if (status) {
          filtered = filtered.filter(
            (b) => (b.params.status || '').toLowerCase() === status.toLowerCase()
          );
        }

        return {
          tabId: tab.id,
          blocks: filtered,
          warnings: parsed.warnings,
        };
      }

      case 'get': {
        const validation = validateBlocksGet(payload);
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { id, tabId } = validation.data;
        const tab = resolveTargetTab(tabId);
        const parsed = parseCntxtDocument(tab.content);
        const block = parsed.relationshipGraph.byId[id];
        if (!block) {
          throw { code: 'NOT_FOUND', message: `CNTXT block with id="${id}" not found` };
        }
        return {
          tabId: tab.id,
          block,
          linksTo: parsed.relationshipGraph.links[id] || [],
          linkedFrom: parsed.relationshipGraph.linkedFrom[id] || [],
        };
      }

      case 'upsert': {
        const validation = validateBlocksUpsert(payload);
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { id, type, content, params, afterBlockId, tabId, actor = 'agent' } = validation.data;
        // Pillar 8 Security: External RPC callers cannot self-assert actor='user' to bypass locked=user.
        // Only internal trusted callers (appId === 'internal') can act as 'user'.
        const effectiveActor: 'user' | 'agent' = (appId === 'internal' && actor === 'user') ? 'user' : 'agent';

        const tab = resolveTargetTab(tabId);
        const parsed = parseCntxtDocument(tab.content);
        const existing = parsed.relationshipGraph.byId[id];

        if (existing && existing.params.locked === 'user' && effectiveActor !== 'user') {
          throw {
            code: 'PERMISSION_DENIED',
            message: `Block "${id}" is locked by the user (locked=user) and cannot be overwritten by an agent.`,
          };
        }

        const result = upsertBlock(
          parsed,
          {
            id,
            type: type || existing?.type || 'markdown',
            params: {
              locked: existing?.params.locked || 'agent',
              ...(params || {}),
              id,
            },
            content,
          },
          afterBlockId
        );

        tabStore.updateTabContent(tab.id, result.raw, true);
        editorRegistry.setContent(tab.id, result.raw);
        let savedToDisk: boolean | undefined = undefined;
        let diskError: string | undefined = undefined;
        if (tab.filePath) {
          try {
            await this.bridge.fs.saveFile(tab.filePath, result.raw);
            savedToDisk = true;
          } catch (err: unknown) {
            savedToDisk = false;
            diskError = String(err);
            console.error(`Failed to save block upsert to disk at "${tab.filePath}":`, err);
            useNotificationStore
              .getState()
              .addNotification(
                'Disk Save Warning',
                `Block "${id}" updated in memory, but saving to "${tab.filePath}" failed: ${diskError}`,
                'warning'
              );
          }
        }

        return {
          tabId: tab.id,
          blockId: id,
          action: result.action,
          ...(savedToDisk !== undefined ? { savedToDisk, ...(diskError ? { diskError } : {}) } : {}),
        };
      }

      case 'updateParams': {
        const validation = validateBlocksUpdateParams(payload);
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { id, params, tabId, actor = 'agent' } = validation.data;
        const effectiveActor: 'user' | 'agent' = (appId === 'internal' && actor === 'user') ? 'user' : 'agent';

        const tab = resolveTargetTab(tabId);
        const parsed = parseCntxtDocument(tab.content);
        const existing = parsed.relationshipGraph.byId[id];
        if (!existing) {
          throw { code: 'NOT_FOUND', message: `CNTXT block with id="${id}" not found` };
        }
        if (existing.params.locked === 'user' && effectiveActor !== 'user') {
          throw {
            code: 'PERMISSION_DENIED',
            message: `Block "${id}" is locked by the user (locked=user) and cannot be modified by an agent.`,
          };
        }

        const updatedRaw = updateBlockParams(parsed, id, params);
        tabStore.updateTabContent(tab.id, updatedRaw, true);
        editorRegistry.setContent(tab.id, updatedRaw);
        let savedToDisk: boolean | undefined = undefined;
        let diskError: string | undefined = undefined;
        if (tab.filePath) {
          try {
            await this.bridge.fs.saveFile(tab.filePath, updatedRaw);
            savedToDisk = true;
          } catch (err: unknown) {
            savedToDisk = false;
            diskError = String(err);
            console.error(`Failed to save updated block params to disk at "${tab.filePath}":`, err);
            useNotificationStore
              .getState()
              .addNotification(
                'Disk Save Warning',
                `Block "${id}" params updated in memory, but saving to "${tab.filePath}" failed: ${diskError}`,
                'warning'
              );
          }
        }

        return {
          tabId: tab.id,
          blockId: id,
          updated: true,
          ...(savedToDisk !== undefined ? { savedToDisk, ...(diskError ? { diskError } : {}) } : {}),
        };
      }

      case 'remove': {
        const validation = validateBlocksRemove(payload);
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { id, tabId, actor = 'agent' } = validation.data;
        const effectiveActor: 'user' | 'agent' = (appId === 'internal' && actor === 'user') ? 'user' : 'agent';

        const tab = resolveTargetTab(tabId);
        const parsed = parseCntxtDocument(tab.content);
        const existing = parsed.relationshipGraph.byId[id];
        if (!existing) {
          throw { code: 'NOT_FOUND', message: `CNTXT block with id="${id}" not found` };
        }
        if (existing.params.locked === 'user' && effectiveActor !== 'user') {
          throw {
            code: 'PERMISSION_DENIED',
            message: `Block "${id}" is locked by the user (locked=user) and cannot be deleted by an agent.`,
          };
        }

        const updatedRaw = removeBlock(parsed, id);
        tabStore.updateTabContent(tab.id, updatedRaw, true);
        editorRegistry.setContent(tab.id, updatedRaw);
        let savedToDisk: boolean | undefined = undefined;
        let diskError: string | undefined = undefined;
        if (tab.filePath) {
          try {
            await this.bridge.fs.saveFile(tab.filePath, updatedRaw);
            savedToDisk = true;
          } catch (err: unknown) {
            savedToDisk = false;
            diskError = String(err);
            console.error(`Failed to save block removal to disk at "${tab.filePath}":`, err);
            useNotificationStore
              .getState()
              .addNotification(
                'Disk Save Warning',
                `Block "${id}" removed in memory, but saving to "${tab.filePath}" failed: ${diskError}`,
                'warning'
              );
          }
        }

        return {
          tabId: tab.id,
          blockId: id,
          removed: true,
          ...(savedToDisk !== undefined ? { savedToDisk, ...(diskError ? { diskError } : {}) } : {}),
        };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown blocks action: ${action}` };
    }
  }

  // ==========================================
  // Directives Domain (Improvements 2, 4, 5)
  // ==========================================

  private async handleDirectivesDomain(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'get': {
        const validation = validateDirectivesGet(payload);
        if (!validation.success) {
          throw { code: 'VALIDATION_ERROR', message: validation.error.message };
        }
        const { format = 'json' } = validation.data;
        if (format === 'markdown') {
          return {
            guideMarkdown: getRawMarkdownGuide(),
          };
        }
        return {
          capabilities: getCapabilitiesManifest(),
          directives: getAgentDirectives(),
          guideMarkdown: getRawMarkdownGuide(),
        };
      }

      case 'getGuide': {
        return {
          guideMarkdown: getRawMarkdownGuide(),
        };
      }

      default:
        throw { code: 'NOT_FOUND', message: `Unknown directives action: ${action}` };
    }
  }
}

let globalHostCommandBus: HostCommandBus | null = null;
export function getHostCommandBus(bridge: IRuntimeBridge): HostCommandBus {
  if (!globalHostCommandBus) {
    globalHostCommandBus = new HostCommandBus(bridge);
  }
  return globalHostCommandBus;
}
