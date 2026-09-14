import { describe, it, expect, beforeEach } from 'vitest';
import { slashCommandEngine, SlashCommandRegistry, STATIC_SLASH_COMMANDS } from '../src/extensions/slashCommands';

describe('SlashCommandRegistry & slashCommandEngine', () => {
  beforeEach(() => {
    slashCommandEngine.resetCommands();
  });

  it('initializes with all default static slash commands', () => {
    const commands = slashCommandEngine.getCommands();
    expect(commands.length).toBe(STATIC_SLASH_COMMANDS.length);
    expect(commands.some(c => c.label === '/system-prompt')).toBe(true);
    expect(commands.some(c => c.label === '/image')).toBe(true);
  });

  it('allows dynamic registration of custom slash commands', () => {
    const customCmd = {
      id: 'custom-notes',
      label: '/notes',
      detail: 'Quick Notes',
      info: 'Insert structured quick notes block',
      type: 'text',
      category: 'Productivity',
      apply: '### Quick Notes\n- [ ] Note 1\n'
    };

    slashCommandEngine.registerCommand(customCmd);
    const retrieved = slashCommandEngine.getCommandById('custom-notes');
    expect(retrieved).toBeDefined();
    expect(retrieved?.label).toBe('/notes');
    expect(slashCommandEngine.getCommands().length).toBe(STATIC_SLASH_COMMANDS.length + 1);
  });

  it('overwrites existing command when registering duplicate id or label', () => {
    const overrideCmd = {
      id: '/image',
      label: '/image',
      detail: 'Custom Media',
      info: 'Overridden image command',
      type: 'keyword',
      apply: '![image](https://example.com)'
    };

    slashCommandEngine.registerCommand(overrideCmd);
    const retrieved = slashCommandEngine.getCommandById('/image');
    expect(retrieved?.detail).toBe('Custom Media');
    expect(retrieved?.info).toBe('Overridden image command');
  });

  it('unregisters command by ID or label', () => {
    expect(slashCommandEngine.getCommandById('/image')).toBeDefined();
    const removed = slashCommandEngine.unregisterCommand('/image');
    expect(removed).toBe(true);
    expect(slashCommandEngine.getCommandById('/image')).toBeUndefined();

    const nonExistent = slashCommandEngine.unregisterCommand('non-existent-cmd');
    expect(nonExistent).toBe(false);
  });

  it('resets commands back to static defaults', () => {
    slashCommandEngine.registerCommand({
      label: '/temp-cmd',
      type: 'text',
      apply: 'temp'
    });
    expect(slashCommandEngine.getCommandById('/temp-cmd')).toBeDefined();

    slashCommandEngine.resetCommands();
    expect(slashCommandEngine.getCommandById('/temp-cmd')).toBeUndefined();
    expect(slashCommandEngine.getCommands().length).toBe(STATIC_SLASH_COMMANDS.length);
  });

  it('returns serializable catalog reflection for UI and settings', () => {
    const catalog = slashCommandEngine.getCatalog();
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBe(STATIC_SLASH_COMMANDS.length);

    const first = catalog[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('label');
    expect(first).toHaveProperty('type');
    expect(first).toHaveProperty('category');
  });
});
