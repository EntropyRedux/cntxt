import { describe, it, expect } from 'vitest';
import { autoHealHtml } from '../src/features/panelApps/format/autoHeal';

describe('autoHealHtml', () => {
  it('handles empty or non-string inputs safely', () => {
    expect(autoHealHtml('')).toBe('');
    expect(autoHealHtml(null as any)).toBe('');
    expect(autoHealHtml(undefined as any)).toBe('');
  });

  it('preserves clean HTML without modifications', () => {
    const clean = '<!DOCTYPE html><html><body><button id="btn">Click me</button></body></html>';
    expect(autoHealHtml(clean)).toBe(clean);
  });

  it('repairs inverted-bracket markdown checklist regexes', () => {
    const broken = `
      <script>
        const line = "- [ ] Todo";
        const replaced = line.replace(/^([\\s]*-\\s*[)[ xX](])/, '$1[x]');
      </script>
    `;
    const healed = autoHealHtml(broken);
    expect(healed).not.toContain('[)[ xX](]');
    expect(healed).toContain('\\[([ xX])\\]');

    // Verify healed code parses cleanly as JavaScript
    const scriptContent = healed.replace(/<\/?script>/g, '');
    expect(() => new Function(scriptContent)).not.toThrow();
  });

  it('repairs unescaped triple backticks in button labels and template literals', () => {
    const broken = `
      <script>
        const card = document.createElement('div');
        card.innerHTML = \`
          <button class="inject-btn" title="Wrap in codeblock">\`\`\` Code</button>
        \`;
      </script>
    `;
    const healed = autoHealHtml(broken);
    expect(healed).toContain('>&#96;&#96;&#96; Code<');

    // Verify healed code parses cleanly as JavaScript
    const scriptContent = healed.replace(/<\/?script>/g, '');
    expect(() => new Function(scriptContent)).not.toThrow();
  });
});
