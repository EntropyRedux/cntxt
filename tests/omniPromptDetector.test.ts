import { describe, it, expect } from 'vitest';
import { detectInteractivePrompt, hasAsciiArt } from '../src/features/omniTerminal/format/omniPromptDetector';

describe('OmniPromptDetector (Phases 1-2 Verification)', () => {
  it('detects Antigravity CLI project trust prompt accurately', () => {
    const text = `
Do you trust the contents of this project?

Antigravity CLI requires permission to read, edit, and execute files here.

> Yes, I trust this folder
  No, exit

↑/↓ Navigate · enter Confirm
Gemini 3.8 Flash · medium
`;

    const result = detectInteractivePrompt(text);
    expect(result.isPrompt).toBe(true);
    expect(result.promptType).toBe('select');
    expect(result.choices.length).toBe(2);
    expect(result.choices[0].label).toBe('Yes, I trust this folder');
    expect(result.choices[0].isSelected).toBe(true);
    expect(result.choices[0].rawKey).toBe('\r');

    expect(result.choices[1].label).toBe('No, exit');
    expect(result.choices[1].isSelected).toBe(false);
    expect(result.choices[1].rawKey).toBe('\x1b[B\r'); // Down + Enter
  });

  it('detects confirmation prompt [y/n] and generates quick keys', () => {
    const text = 'Do you want to proceed with full codebase audit? [y/N]';
    const result = detectInteractivePrompt(text);

    expect(result.isPrompt).toBe(true);
    expect(result.promptType).toBe('confirm');
    expect(result.choices.length).toBe(2);
    expect(result.choices[0].label).toBe('Yes (Y)');
    expect(result.choices[0].rawKey).toBe('y\r');
    expect(result.choices[1].label).toBe('No (N)');
    expect(result.choices[1].rawKey).toBe('n\r');
  });

  it('detects Inquirer arrow menu with 3 options', () => {
    const text = `
? Select your model: (Use arrow keys)
  GPT-4o
❯ Claude 3.5 Sonnet
  Gemini 1.5 Pro
`;

    const result = detectInteractivePrompt(text);
    expect(result.isPrompt).toBe(true);
    expect(result.choices.length).toBe(3);
    expect(result.choices[1].isSelected).toBe(true);
    expect(result.choices[1].label).toBe('Claude 3.5 Sonnet');
    expect(result.choices[1].rawKey).toBe('\r');

    // Choice 0 is 1 step UP
    expect(result.choices[0].rawKey).toBe('\x1b[A\r');
    // Choice 2 is 1 step DOWN
    expect(result.choices[2].rawKey).toBe('\x1b[B\r');
  });

  it('detects ASCII art logos and banners', () => {
    const asciiText = `
  ___         _   _                      _ _         
 / _ \\  _ __ | |_(_) __ _ _ __ __ ___   (_) |_ _   _ 
/ /_\\ \\| '_ \\| __| |/ _\` | '__/ _\` \\ \\ / / | __| | | |
|  _  || | | | |_| | (_| | | | (_| |\\ V /| | |_| |_| |
\\_| |_/|_| |_|\\__|_|\\__, |_|  \\__,_| \\_/ |_|\\__|\\__, |
                    |___/                       |___/ 
`;
    expect(hasAsciiArt(asciiText)).toBe(true);

    const regularText = `
All 612 tests passing.
No regressions detected.
`;
    expect(hasAsciiArt(regularText)).toBe(false);
  });

  it('does NOT falsely detect standard CLI output or prompt echoes as interactive menus', () => {
    const text1 = `
> a
Ready when you are. Please let me know what task or project you would like to work on!
`;
    const result1 = detectInteractivePrompt(text1);
    expect(result1.isPrompt).toBe(false);
    expect(result1.choices).toHaveLength(0);

    const text2 = `
> test
Hello! I am online and operating in Pass 1 Independent Auditor mode for C:\\Projects\\LocalActive\\.
`;
    const result2 = detectInteractivePrompt(text2);
    expect(result2.isPrompt).toBe(false);
    expect(result2.choices).toHaveLength(0);
  });
});
