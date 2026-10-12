/**
 * ANSI Escape Code Parser
 * 
 * Lightweight, zero-dependency parser converting ANSI terminal output
 * into structured tokens with CSS color & style attributes.
 */

export interface AnsiToken {
  text: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  bgColor?: string;
}

const ANSI_COLORS: Record<number, string> = {
  30: '#1f2937', // black
  31: '#ef4444', // red
  32: '#22c55e', // green
  33: '#eab308', // yellow
  34: '#3b82f6', // blue
  35: '#a855f7', // magenta
  36: '#06b6d4', // cyan
  37: '#f3f4f6', // white
  90: '#6b7280', // bright black (gray)
  91: '#f87171', // bright red
  92: '#4ade80', // bright green
  93: '#fde047', // bright yellow
  94: '#60a5fa', // bright blue
  95: '#c084fc', // bright magenta
  96: '#22d3ee', // bright cyan
  97: '#ffffff', // bright white
};

const ANSI_BG_COLORS: Record<number, string> = {
  40: '#111827',
  41: '#7f1d1d',
  42: '#14532d',
  43: '#713f12',
  44: '#1e3a8a',
  45: '#581c87',
  46: '#164e63',
  47: '#374151',
  100: '#374151',
  101: '#991b1b',
  102: '#166534',
  103: '#854d0e',
  104: '#1e40af',
  105: '#6b21a8',
  106: '#155e75',
  107: '#4b5563',
};

/**
 * Strips non-formatting control codes (cursor movement, clear line, etc.)
 */
export function sanitizeAnsiText(input: string): string {
  // Strip OSC sequences (e.g. \x1b]0;Title\x07)
  let sanitized = input.replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '');
  // Strip CSI sequences other than color 'm' (e.g. \x1b[2K, \x1b[?25h, \x1b[1A)
  sanitized = sanitized.replace(/\x1b\[[0-9;?]*[A-LN-Za-ln-z]/g, '');
  return sanitized;
}

/**
 * Parses raw terminal text with ANSI escape codes into styled tokens.
 */
export function parseAnsi(raw: string): AnsiToken[] {
  const clean = sanitizeAnsiText(raw);
  const regex = /\x1b\[([0-9;]*)m/g;
  const tokens: AnsiToken[] = [];

  let lastIndex = 0;
  let currentBold = false;
  let currentDim = false;
  let currentItalic = false;
  let currentUnderline = false;
  let currentColor: string | undefined = undefined;
  let currentBgColor: string | undefined = undefined;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(clean)) !== null) {
    const textSegment = clean.substring(lastIndex, match.index);
    if (textSegment) {
      tokens.push({
        text: textSegment,
        bold: currentBold || undefined,
        dim: currentDim || undefined,
        italic: currentItalic || undefined,
        underline: currentUnderline || undefined,
        color: currentColor,
        bgColor: currentBgColor,
      });
    }

    const codeStr = match[1] || '0';
    const codes = codeStr.split(';').map(c => parseInt(c || '0', 10));

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) {
        currentBold = false;
        currentDim = false;
        currentItalic = false;
        currentUnderline = false;
        currentColor = undefined;
        currentBgColor = undefined;
      } else if (code === 1) {
        currentBold = true;
      } else if (code === 2) {
        currentDim = true;
      } else if (code === 3) {
        currentItalic = true;
      } else if (code === 4) {
        currentUnderline = true;
      } else if (code === 22) {
        currentBold = false;
        currentDim = false;
      } else if (code === 23) {
        currentItalic = false;
      } else if (code === 24) {
        currentUnderline = false;
      } else if (code === 39) {
        currentColor = undefined;
      } else if (code === 49) {
        currentBgColor = undefined;
      } else if (ANSI_COLORS[code]) {
        currentColor = ANSI_COLORS[code];
      } else if (ANSI_BG_COLORS[code]) {
        currentBgColor = ANSI_BG_COLORS[code];
      } else if (code === 38 && codes[i + 1] === 5) {
        // 256 color: 38;5;n
        const n = codes[i + 2];
        if (n !== undefined) {
          currentColor = `hsl(${(n * 36) % 360}, 70%, 60%)`;
          i += 2;
        }
      }
    }

    lastIndex = regex.lastIndex;
  }

  const remaining = clean.substring(lastIndex);
  if (remaining) {
    tokens.push({
      text: remaining,
      bold: currentBold || undefined,
      dim: currentDim || undefined,
      italic: currentItalic || undefined,
      underline: currentUnderline || undefined,
      color: currentColor,
      bgColor: currentBgColor,
    });
  }

  return tokens;
}
