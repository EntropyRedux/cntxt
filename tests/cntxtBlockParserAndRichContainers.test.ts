import { describe, it, expect, beforeEach } from 'vitest';
import { Text, EditorState } from '@codemirror/state';
import {
  parseBlockInfoString,
  serializeBlockInfoString,
  parseCntxtDocument,
  updateBlockParams,
  updateBlockContent,
  insertBlock,
  removeBlock,
  upsertBlock,
  appendUserInboxEntry,
  prependDeliverableToThread,
  hasCntxtPipeBlock,
  promoteToCntxtExtension,
} from '../src/services/editor/cntxtBlockParser';
import {
  findCntxtContainers,
  findCodeBlocks,
  findMathBlocks,
  findTables,
} from '../src/extensions/liveMarkdown/scanners';
import { liveMarkdownExtension } from '../src/extensions/liveMarkdown';
import { HostCommandBus } from '../src/features/panelApps/rpc/hostCommandBus';
import { useTabStore } from '../src/store/tabStore';
import { BrowserRuntimeAdapter } from '../src/adapters/BrowserRuntimeAdapter';

describe('FG-22: CNTXT Block Parser, Rich Containers & Blocks RPC', () => {
  describe('1. parseBlockInfoString & serializeBlockInfoString', () => {
    it('extracts all 6 governance primitives, rendererParams, and title label', () => {
      const parsed = parseBlockInfoString(
        'markdown | id=fg22-plan tags=deliverable,plan locked=agent status=review link=fg21-summary source=@agy title="FG-22 Implementation Plan" theme=indigo'
      );

      expect(parsed.type).toBe('markdown');
      expect(parsed.isCNTXT).toBe(true);
      expect(parsed.isRichContainer).toBe(true);
      expect(parsed.params.id).toBe('fg22-plan');
      expect(parsed.params.tags).toEqual(['deliverable', 'plan']);
      expect(parsed.params.locked).toBe('agent');
      expect(parsed.params.status).toBe('review');
      expect(parsed.params.link).toEqual(['fg21-summary']);
      expect(parsed.params.source).toBe('@agy');
      expect(parsed.params.label).toBe('FG-22 Implementation Plan');
      expect(parsed.params.rendererParams?.theme).toBe('indigo');
    });

    it('supports shorthand legacy label after pipe (e.g. @agy · Plan Title)', () => {
      const parsed = parseBlockInfoString('markdown|@agy · FG-21 Plan (04:30)');
      expect(parsed.isCNTXT).toBe(true);
      expect(parsed.isRichContainer).toBe(true);
      expect(parsed.params.source).toBe('@agy');
      expect(parsed.params.label).toBe('FG-21 Plan (04:30)');
    });

    it('marks non-markdown programming languages with pipe as isCNTXT=true but isRichContainer=false', () => {
      const parsed = parseBlockInfoString('typescript | id=auth-helper locked=user');
      expect(parsed.isCNTXT).toBe(true);
      expect(parsed.isRichContainer).toBe(false);
      expect(parsed.params.id).toBe('auth-helper');
      expect(parsed.params.locked).toBe('user');
    });

    it('round-trips serializeBlockInfoString cleanly', () => {
      const serialized = serializeBlockInfoString('markdown', {
        id: 'spec-1',
        tags: ['deliverable', 'architecture'],
        locked: 'user',
        status: 'approved',
        source: '@agy',
        label: 'System Spec',
      });
      expect(serialized).toContain('markdown | id=spec-1');
      expect(serialized).toContain('tags=deliverable,architecture');
      expect(serialized).toContain('locked=user');
      expect(serialized).toContain('status=approved');
      expect(serialized).toContain('title="System Spec"');
    });
  });

  describe('2. parseCntxtDocument, RelationshipGraph & Surgical Writers', () => {
    const sampleDoc = [
      '# Project Hub',
      '',
      '~~~markdown | id=plan-1 tags=deliverable,plan locked=agent status=review source=@agy title="Architecture Plan"',
      '## Section 1',
      '',
      '```mermaid',
      'graph LR',
      '  A --> B',
      '```',
      '',
      '| Feature | Status |',
      '| :--- | :--- |',
      '| Parser | Ready |',
      '~~~',
      '',
      '~~~markdown | id=audit-1 tags=deliverable,audit link=plan-1,missing-block status=approved locked=user',
      'Audit passed 100%.',
      '~~~',
    ].join('\n');

    it('parses outer ~~~ blocks containing inner ```mermaid fences without premature closing and builds relationshipGraph', () => {
      const doc = parseCntxtDocument(sampleDoc);
      expect(doc.blocks).toHaveLength(2);

      const planBlock = doc.relationshipGraph.byId['plan-1'];
      expect(planBlock).toBeDefined();
      expect(planBlock.isCNTXT).toBe(true);
      expect(planBlock.isRichContainer).toBe(true);
      expect(planBlock.content).toContain('```mermaid');
      expect(planBlock.content).toContain('| Parser | Ready |');

      const auditBlock = doc.relationshipGraph.byId['audit-1'];
      expect(auditBlock).toBeDefined();
      expect(doc.relationshipGraph.links['audit-1']).toEqual(['plan-1', 'missing-block']);
      expect(doc.relationshipGraph.linkedFrom['plan-1']).toEqual(['audit-1']);
      expect(doc.relationshipGraph.byTag['deliverable']).toHaveLength(2);
      expect(doc.warnings.some((w) => w.includes('missing-block'))).toBe(true);
    });

    it('surgically updates params, content, inserts, and removes blocks without corrupting surrounding markdown', () => {
      let doc = parseCntxtDocument(sampleDoc);

      // 1. updateBlockParams
      const afterParamUpdate = updateBlockParams(doc, 'plan-1', {
        status: 'approved',
        locked: 'user',
      });
      doc = parseCntxtDocument(afterParamUpdate);
      expect(doc.relationshipGraph.byId['plan-1'].params.status).toBe('approved');
      expect(doc.relationshipGraph.byId['plan-1'].params.locked).toBe('user');
      expect(doc.raw).toContain('# Project Hub');

      // 2. updateBlockContent
      const afterContentUpdate = updateBlockContent(
        doc,
        'plan-1',
        '## Updated Plan\n\n```ts\nconst x = 1;\n```'
      );
      doc = parseCntxtDocument(afterContentUpdate);
      expect(doc.relationshipGraph.byId['plan-1'].content).toContain('const x = 1;');

      // 3. insertBlock after plan-1
      const afterInsert = insertBlock(
        doc,
        {
          type: 'markdown',
          params: { id: 'summary-1', tags: ['summary'], link: ['plan-1'] },
          content: 'Summary content.',
        },
        'plan-1'
      );
      doc = parseCntxtDocument(afterInsert);
      expect(doc.blocks.map((b) => b.params.id)).toEqual(['plan-1', 'summary-1', 'audit-1']);

      // 4. removeBlock
      const afterRemove = removeBlock(doc, 'summary-1');
      doc = parseCntxtDocument(afterRemove);
      expect(doc.blocks.map((b) => b.params.id)).toEqual(['plan-1', 'audit-1']);

      // 5. upsertBlock
      const upserted = upsertBlock(doc, {
        id: 'plan-1',
        content: 'Replaced via upsert',
      });
      expect(upserted.action).toBe('updated');
      doc = parseCntxtDocument(upserted.raw);
      expect(doc.relationshipGraph.byId['plan-1'].content).toBe('Replaced via upsert');
    });
  });

  describe('3. Two-Tier Rich Container Scanners (Mermaid, Tables & Math Inside CNTXT Containers)', () => {
    it('detects inner Mermaid code blocks, Markdown tables, and LaTeX math inside a ~~~markdown | ... Rich Container', () => {
      const text = Text.of([
        '# Top Document',
        '~~~markdown | id=rich-1 status=ready title="Rich Deliverable"',
        '## Inner Heading',
        '',
        '| Metric | Value |',
        '| :--- | :--- |',
        '| Speed | 100% |',
        '',
        '$$',
        'E = mc^2',
        '$$',
        '',
        '```mermaid',
        'flowchart TD',
        '  Start --> End',
        '```',
        '~~~',
      ]);

      const containers = findCntxtContainers(text);
      const codeBlocks = findCodeBlocks(text, containers);
      const mathBlocks = findMathBlocks(text, codeBlocks, containers);
      const tables = findTables(text, codeBlocks, mathBlocks, containers);

      // Outer container covers lines 2..17
      expect(containers.get(2)?.role).toBe('start');
      expect(containers.get(3)?.role).toBe('mid');
      expect(containers.get(17)?.role).toBe('end');

      // Inner table on lines 5..7 is detected!
      expect(tables.has(5)).toBe(true);
      expect(tables.get(5)?.table.headers).toEqual(['Metric', 'Value']);

      // Inner math block on lines 9..11 is detected!
      expect(mathBlocks.has(9)).toBe(true);
      expect(mathBlocks.get(9)?.latex).toBe('E = mc^2');

      // Inner mermaid block on lines 13..16 is detected!
      expect(codeBlocks.has(13)).toBe(true);
      expect(codeBlocks.get(13)?.block.language).toBe('mermaid');

      // Verify liveMarkdownExtension builds decorations cleanly on cursor outside container
      const state = EditorState.create({
        doc: text,
        selection: { anchor: 0 },
        extensions: [liveMarkdownExtension(true)],
      });
      expect(state.doc.lines).toBe(17);
    });
  });

  describe('4. HostCommandBus blocks.* Domain & locked=user Guardrail', () => {
    let bus: HostCommandBus;

    beforeEach(() => {
      const store = useTabStore.getState();
      const tabId = store.createTab(
        'Orchestration.md',
        [
          '~~~markdown | id=agent-block tags=deliverable locked=agent status=draft',
          'Initial agent draft',
          '~~~',
          '',
          '~~~markdown | id=user-spec tags=spec locked=user status=approved',
          'Frozen user requirements',
          '~~~',
        ].join('\n'),
        'markdown'
      );
      store.setActiveTabId(tabId);
      bus = new HostCommandBus(new BrowserRuntimeAdapter());
    });

    it('lists, gets, and upserts agent-unlocked blocks while rejecting agent mutations on locked=user blocks', async () => {
      // 1. blocks.list
      const listRes = await bus.handleRequest({
        id: 'req-1',
        domain: 'blocks',
        action: 'list',
        appId: 'antigravity',
        payload: {},
      });
      expect(listRes.success).toBe(true);
      expect((listRes.data as any).blocks).toHaveLength(2);

      // 2. blocks.upsert on locked=agent succeeds
      const upsertOk = await bus.handleRequest({
        id: 'req-2',
        domain: 'blocks',
        action: 'upsert',
        appId: 'antigravity',
        payload: {
          id: 'agent-block',
          content: 'Updated agent plan content',
          params: { status: 'review' },
        },
      });
      expect(upsertOk.success).toBe(true);

      // 3. blocks.get verifies updated content and status
      const getRes = await bus.handleRequest({
        id: 'req-3',
        domain: 'blocks',
        action: 'get',
        appId: 'antigravity',
        payload: { id: 'agent-block' },
      });
      expect(getRes.success).toBe(true);
      expect((getRes.data as any).block.content).toBe('Updated agent plan content');
      expect((getRes.data as any).block.params.status).toBe('review');

      // 4. blocks.upsert on locked=user is rejected with PERMISSION_DENIED!
      const upsertDenied = await bus.handleRequest({
        id: 'req-4',
        domain: 'blocks',
        action: 'upsert',
        appId: 'antigravity',
        payload: {
          id: 'user-spec',
          content: 'Attempted agent overwrite of user spec',
        },
      });
      expect(upsertDenied.success).toBe(false);
      expect(upsertDenied.error?.code).toBe('PERMISSION_DENIED');

      // 4b. FIND-01 Security: External caller self-asserting actor='user' is STILL rejected!
      const spoofDenied = await bus.handleRequest({
        id: 'req-4b',
        domain: 'blocks',
        action: 'upsert',
        appId: 'antigravity', // External caller!
        payload: {
          id: 'user-spec',
          content: 'Attempted agent overwrite by spoofing actor=user',
          actor: 'user',
        },
      });
      expect(spoofDenied.success).toBe(false);
      expect(spoofDenied.error?.code).toBe('PERMISSION_DENIED');

      // 4c. FIND-01 Security: Internal caller with actor='user' is permitted to update user-locked block
      const internalAllowed = await bus.handleRequest({
        id: 'req-4c',
        domain: 'blocks',
        action: 'upsert',
        appId: 'internal', // Trusted internal caller!
        payload: {
          id: 'user-spec',
          content: 'Legitimate user update from internal UI',
          actor: 'user',
        },
      });
      expect(internalAllowed.success).toBe(true);

      // 5. blocks.remove on locked=user by external caller is rejected with PERMISSION_DENIED!
      const removeDenied = await bus.handleRequest({
        id: 'req-5',
        domain: 'blocks',
        action: 'remove',
        appId: 'antigravity',
        payload: {
          id: 'user-spec',
          actor: 'user', // Spoof attempt rejected
        },
      });
      expect(removeDenied.success).toBe(false);
      expect(removeDenied.error?.code).toBe('PERMISSION_DENIED');
    });
  });

  describe('4. FG-23: Active Thread Routing, User Inbox & Extension Promotion', () => {
    it('promotes file names and paths to .cntxt correctly', () => {
      expect(promoteToCntxtExtension('README.md')).toBe('README.cntxt');
      expect(promoteToCntxtExtension('notes.markdown')).toBe('notes.cntxt');
      expect(promoteToCntxtExtension('data.txt')).toBe('data.cntxt');
      expect(promoteToCntxtExtension('thread.cntxt')).toBe('thread.cntxt');
      expect(promoteToCntxtExtension('C:/docs/spec.md')).toBe('C:/docs/spec.cntxt');
    });

    it('detects CNTXT pipe blocks via hasCntxtPipeBlock', () => {
      expect(hasCntxtPipeBlock('```markdown | id=test\ncontent\n```')).toBe(true);
      expect(hasCntxtPipeBlock('~~~markdown | id=test\ncontent\n~~~')).toBe(true);
      expect(hasCntxtPipeBlock('```typescript\nconsole.log(1);\n```')).toBe(false);
      expect(hasCntxtPipeBlock('# Regular Markdown')).toBe(false);
    });

    it('creates id=user-inbox pinned at top and appends subsequent citations', () => {
      const initialDoc = '# Project\n\nSome introductory content.\n';

      // 1. First comment creates id=user-inbox at the top
      const withFirstComment = appendUserInboxEntry(initialDoc, {
        blockId: 'agent-plan',
        startLine: 12,
        endLine: 18,
        quotedText: 'export const tokenBudget = 1000;',
        comment: 'Please increase token budget to 4000.',
      });

      expect(withFirstComment.startsWith('~~~markdown | id=user-inbox')).toBe(true);
      expect(withFirstComment).toContain('source=@USER');
      expect(withFirstComment).toContain('locked=user');
      expect(withFirstComment).toContain('status=open');
      expect(withFirstComment).toContain('link=agent-plan#L12-L18');
      expect(withFirstComment).toContain('Please increase token budget to 4000.');
      expect(withFirstComment).toContain('# Project');

      // 2. Second comment appends into the existing user-inbox
      const withSecondComment = appendUserInboxEntry(withFirstComment, {
        blockId: 'agent-plan',
        startLine: 25,
        endLine: 25,
        comment: 'Also verify test coverage for this function.',
      });

      expect(withSecondComment.startsWith('~~~markdown | id=user-inbox')).toBe(true);
      expect(withSecondComment).toContain('link=agent-plan#L12-L18,agent-plan#L25');
      expect(withSecondComment).toContain('Please increase token budget to 4000.');
      expect(withSecondComment).toContain('Also verify test coverage for this function.');
    });

    it('prepends deliverable to thread immediately below id=user-inbox', () => {
      const threadWithInbox = [
        '~~~markdown | id=user-inbox source=@USER locked=user status=open link=spec-1#L5',
        '### User Comment',
        'Please update the schema.',
        '~~~',
        '',
        '~~~markdown | id=old-deliv status=done',
        'Old deliverable body.',
        '~~~',
      ].join('\n');

      const incomingDeliverable = [
        '~~~markdown | id=new-deliv tags=deliverable locked=agent status=ready',
        'New deliverable body.',
        '~~~',
      ].join('\n');

      const prepended = prependDeliverableToThread(threadWithInbox, incomingDeliverable);

      // Verify user-inbox is still at the very top
      expect(prepended.startsWith('~~~markdown | id=user-inbox')).toBe(true);
      // Verify new deliverable is placed right after user-inbox and before old deliverable
      const inboxIdx = prepended.indexOf('id=user-inbox');
      const newDelivIdx = prepended.indexOf('id=new-deliv');
      const oldDelivIdx = prepended.indexOf('id=old-deliv');

      expect(inboxIdx).toBeLessThan(newDelivIdx);
      expect(newDelivIdx).toBeLessThan(oldDelivIdx);
    });

    it('routes incoming deliverables into the Active Thread tab via HostCommandBus', async () => {
      const bridge = new BrowserRuntimeAdapter();
      const bus = new HostCommandBus(bridge);
      const tabStore = useTabStore.getState();

      // Create an existing active thread tab
      const tabId = tabStore.createTab(
        'WorkspaceThread.cntxt',
        '# Existing Thread Content\n',
        'markdown'
      );
      tabStore.toggleActiveThread(tabId);

      const activeTab = useTabStore.getState().tabs.find((t) => t.id === tabId);
      expect(activeTab?.isActiveThread).toBe(true);

      const deliverableContent = [
        '~~~markdown | id=ag-plan tags=deliverable locked=agent status=ready',
        'Agent implementation plan.',
        '~~~',
      ].join('\n');

      const res = await bus.handleRequest({
        id: 'thread-test-1',
        domain: 'tabs',
        action: 'create',
        appId: 'antigravity',
        payload: {
          title: 'Agent Deliverable',
          content: deliverableContent,
        },
      });

      expect(res.success).toBe(true);
      expect((res.data as any).tabId).toBe(tabId);
      expect((res.data as any).prependedToActiveThread).toBe(true);

      const updatedTab = useTabStore.getState().tabs.find((t) => t.id === tabId);
      expect(updatedTab?.content).toContain('id=ag-plan');
      expect(updatedTab?.content).toContain('# Existing Thread Content');
    });

    it('does not silently mutate filePath of existing disk files when content contains cntxt blocks (FIND-05)', () => {
      const tabStore = useTabStore.getState();
      const tabId = tabStore.createTab(
        'my-notes.md',
        '# Initial Notes\n',
        'markdown',
        'C:/projects/docs/my-notes.md'
      );

      const tabBefore = useTabStore.getState().tabs.find((t) => t.id === tabId);
      expect(tabBefore?.filePath).toBe('C:/projects/docs/my-notes.md');

      // User types or pastes a CNTXT block
      tabStore.updateTabContent(
        tabId,
        '# Initial Notes\n\n~~~markdown | id=sec-1\nSome block\n~~~\n',
        false
      );

      const tabAfter = useTabStore.getState().tabs.find((t) => t.id === tabId);
      // Invariant: filePath must remain the user original disk path
      expect(tabAfter?.filePath).toBe('C:/projects/docs/my-notes.md');
    });
  });
});
