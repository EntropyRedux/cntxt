/**
 * Omni Terminal Interactive Prompt Detector
 * 
 * Inspects terminal output streams for interactive TUI prompts:
 * 1. Arrow-key select/radio menus (e.g. Inquirer, Enquirer, Prompts, Clack, Gum)
 * 2. Yes/No and confirmation questions ([y/n], [Y/n], [y/N])
 * 3. ASCII banner / logo detection for fixed monospace presentation
 */

export interface DetectedChoice {
  label: string;
  isSelected: boolean;
  index: number;
  rawKey: string;
}

export interface DetectedPrompt {
  isPrompt: boolean;
  promptType: 'select' | 'confirm' | 'none';
  question: string;
  choices: DetectedChoice[];
  navigationHint?: string;
  hasAsciiArt: boolean;
}

/**
 * Checks if a block of text contains ASCII art, terminal logos, or box-drawing characters
 */
export function hasAsciiArt(text: string): boolean {
  if (!text) return false;
  const lines = text.split('\n');

  let asciiArtLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Matches repeated slashes, pipes, underscores, block characters, box drawing
    const asciiCharCount = (trimmed.match(/[/\\|_#@=+\-~*^`·█▀▄▌▐░▒▓┌┐└┘├┤┬┴┼]/g) || []).length;
    if (trimmed.length >= 4 && asciiCharCount / trimmed.length > 0.45) {
      asciiArtLines++;
    }
  }

  return asciiArtLines >= 2;
}

/**
 * Parses clean terminal text to detect interactive choices and confirmation prompts
 */
export function detectInteractivePrompt(text: string): DetectedPrompt {
  if (!text) {
    return {
      isPrompt: false,
      promptType: 'none',
      question: '',
      choices: [],
      hasAsciiArt: false,
    };
  }

  const containsAscii = hasAsciiArt(text);
  const lines = text.split('\n').map((l) => l.trimEnd());

  // 1. Check for Confirmation Prompts: e.g. [y/n], [Y/n], [y/N], (y/n)
  const confirmRegex = /(?:\[(y)\/(n)\]|\((y)\/(n)\)|\[(Y)\/(n)\]|\[(y)\/(N)\])\s*[:?]?\s*$/i;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const line = lines[i].trim();
    const match = line.match(confirmRegex);
    if (match) {
      const isDefaultNo = line.includes('[y/N]');
      return {
        isPrompt: true,
        promptType: 'confirm',
        question: line.replace(confirmRegex, '').trim() || 'Confirm action',
        navigationHint: 'Press Y for Yes, N for No',
        choices: [
          {
            label: 'Yes (Y)',
            isSelected: !isDefaultNo,
            index: 0,
            rawKey: 'y\r',
          },
          {
            label: 'No (N)',
            isSelected: isDefaultNo,
            index: 1,
            rawKey: 'n\r',
          },
        ],
        hasAsciiArt: containsAscii,
      };
    }
  }

  // 2. Check for Navigation Hints: e.g. "↑/↓ Navigate · enter Confirm" or "(Use arrow keys)"
  let navigationHint: string | undefined;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 4); i--) {
    const line = lines[i].trim();
    if (
      line.includes('Navigate') ||
      line.includes('arrow keys') ||
      line.includes('enter Confirm') ||
      line.includes('Press enter') ||
      line.includes('↑/↓') ||
      line.includes('to select')
    ) {
      navigationHint = line;
      break;
    }
  }

  // 3. Scan for Arrow-key Select / Radio menus
  // Valid menus MUST either have an explicit navigation hint (e.g. "↑/↓ Navigate", "(Use arrow keys)")
  // or explicit radio/checkbox choice markers (e.g. ❯, ●, [x], (•), ○, [ ], ( )).
  // Standard command line prompts like `> a` or `> test` MUST NEVER be treated as menus.
  const choices: DetectedChoice[] = [];
  let selectedIndex = -1;
  let question = '';

  const hasRadioMarker = lines.some((l) => /^\s*(?:❯|●|\[x\]|\(•\))\s+\S{2,}/.test(l));
  const hasArrowMenuWithHint = Boolean(navigationHint) && lines.some((l) => /^\s*>\s+\S{2,}/.test(l));

  if (hasRadioMarker || hasArrowMenuWithHint) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip blank or navigation lines
      if (!trimmed || trimmed === navigationHint) continue;

      // Selected choice indicator
      const selectedMatch = hasRadioMarker
        ? line.match(/^\s*(?:❯|●|\[x\]|\(•\))\s+(.+)$/i)
        : line.match(/^\s*>\s+(.+)$/i);

      // Unselected choice indicator: explicit radio bullets or indented items
      const unselectedMatch = line.match(
        /^(?:\s{2,}|\s*[-○•]\s+|\s*\[\s?\]\s+|\s*\(\s?\)\s+)(.+)$/i
      );

      if (selectedMatch) {
        const label = selectedMatch[1].trim();
        // Guard against single characters (e.g. `> a`) or common conversational dialogue
        if (
          label.length >= 2 &&
          !/^(Ready|Hello|Done|Generating|I am|The folder|Deleting)/i.test(label)
        ) {
          selectedIndex = choices.length;
          choices.push({
            label,
            isSelected: true,
            index: choices.length,
            rawKey: '\r',
          });
        }
      } else if (unselectedMatch) {
        const label = unselectedMatch[1].trim();
        if (
          label.length >= 2 &&
          !label.includes('requires permission') &&
          !label.includes('Navigate') &&
          !label.includes('Confirm') &&
          !/^(Ready|Hello|Done|Generating|I am|The folder|Deleting)/i.test(label) &&
          label.length < 80
        ) {
          choices.push({
            label,
            isSelected: false,
            index: choices.length,
            rawKey: '',
          });
        }
      } else if (
        choices.length === 0 &&
        (trimmed.endsWith('?') ||
          trimmed.includes('requires permission') ||
          trimmed.includes('Select') ||
          trimmed.startsWith('?'))
      ) {
        question = trimmed.replace(/^\?\s*/, '');
      }
    }
  }

  // If at least 2 distinct choices detected and a selected item is present
  if (choices.length >= 2 && selectedIndex !== -1) {
    // Calculate raw navigation keys for unselected choices relative to selected index
    for (const choice of choices) {
      if (choice.isSelected) {
        choice.rawKey = '\r'; // Confirm current item
      } else if (choice.index > selectedIndex) {
        const stepsDown = choice.index - selectedIndex;
        choice.rawKey = '\x1b[B'.repeat(stepsDown) + '\r'; // Down arrows + Enter
      } else {
        const stepsUp = selectedIndex - choice.index;
        choice.rawKey = '\x1b[A'.repeat(stepsUp) + '\r'; // Up arrows + Enter
      }
    }

    return {
      isPrompt: true,
      promptType: 'select',
      question: question || 'Please select an option:',
      choices,
      navigationHint: navigationHint || '↑/↓ Navigate · enter Confirm',
      hasAsciiArt: containsAscii,
    };
  }

  return {
    isPrompt: false,
    promptType: 'none',
    question: '',
    choices: [],
    hasAsciiArt: containsAscii,
  };
}
