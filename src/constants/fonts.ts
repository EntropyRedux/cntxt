import { ThemeName } from '../types';

export type FontCategory = 'monospace' | 'proportional' | 'serif' | 'accessibility';

export interface CuratedFont {
  id: string;
  name: string;
  fontFamily: string;
  category: FontCategory;
  categoryLabel: string;
  badge: string;
  creator: string;
  year: string;
  scientificBasis: string;
  researchFocus: string;
  keyFeatures: string[];
  idealFor: string;
  popularTools: string[];
  sampleSnippet: string;
  isDefault?: boolean;
}

export const CURATED_FONTS: CuratedFont[] = [
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    fontFamily: "'JetBrains Mono', monospace",
    category: 'monospace',
    categoryLabel: 'Developer Ergonomics',
    badge: 'Standard Default',
    creator: 'Philipp Nurullin & JetBrains',
    year: '2020',
    researchFocus: 'Eye Movement Saccades & Cognitive Fatigue Reduction',
    scientificBasis: 'Engineered specifically for extended coding and reading sessions. Research on fixation pauses indicates readers lose significant comprehension time distinguishing similar glyphs. JetBrains Mono features an increased 19% x-height, distinct character geometry for ambiguous pairs (dotted zero vs O, 1 vs l vs I), asymmetric vertical stems, and 8° italics that preserve character grid alignment.',
    keyFeatures: [
      '19% increased x-height for effortless character scanning',
      'Engineered character disambiguation (0 / O, 1 / l / I)',
      'Asymmetric stems reducing visual rhythm monotony',
      '138 code-optimized programming ligatures'
    ],
    idealFor: 'Technical prompt engineering, markdown drafting, JSON/YAML schemas, long sessions',
    popularTools: ['JetBrains IDEs (IntelliJ, PyCharm, WebStorm)', 'VS Code', 'Zed', 'Warp Terminal'],
    sampleSnippet: 'const prompt = `System: Analyze token efficiency <= 128kb`; // 0 vs O != 1 vs l',
    isDefault: true
  },
  {
    id: 'fira-code',
    name: 'Fira Code',
    fontFamily: "'Fira Code', monospace",
    category: 'monospace',
    categoryLabel: 'Cognitive Chunking',
    badge: 'Ligature Synthesis',
    creator: 'Nikita Prokopov & Mozilla',
    year: '2014',
    researchFocus: 'Miller’s Law & Visual Chunking of Multi-Character Operators',
    scientificBasis: 'Built on cognitive chunking principles. By synthesizing compound symbols (e.g. ===, =>, !=, <!--, ->, ::) into singular coherent visual tokens, readers reduce cognitive saccadic load. Eye-tracking trials in syntax-heavy documents demonstrate faster operator parsing and lower reading regressions.',
    keyFeatures: [
      'Multi-character ligature synthesis into single cognitive tokens',
      'Uniform monospaced geometry on both high-DPI and standard monitors',
      'High-contrast punctuation markers (colons, brackets, braces)',
      'Optimized for dense technical notation and markdown math'
    ],
    idealFor: 'Math formulas, logic-heavy prompts, markdown tables, regex editing',
    popularTools: ['VS Code (Top 3 coding font)', 'Sublime Text', 'Neovim', 'Terminal'],
    sampleSnippet: 'if (x !== null && score >= threshold) return x => x.transform();'
  },
  {
    id: 'ibm-plex-mono',
    name: 'IBM Plex Mono',
    fontFamily: "'IBM Plex Mono', monospace",
    category: 'monospace',
    categoryLabel: 'Humanist Grotesque',
    badge: 'High Optical Aperture',
    creator: 'Mike Abbink & Bold Monday (IBM)',
    year: '2017',
    researchFocus: 'Tinker’s Legibility Standards & Engineered Ink Traps',
    scientificBasis: 'Engineered to balance man and machine aesthetics. Utilizes wide, open apertures on lowercase letters (c, e, a, s) and engineered ink-traps that maintain distinct edge acuity even under small point sizes, low-contrast ambient lighting, or sub-pixel rendering. Clinical legibility tests show exceptional performance in low-light environments.',
    keyFeatures: [
      'Wide open apertures preventing glyph closure at small sizes',
      'Engineered micro ink-traps ensuring crisp rasterization',
      'Humanist curve cadence with engineered industrial clarity',
      'Distinctive italic design for syntax highlighting'
    ],
    idealFor: 'Tabular data, structured documentation, high-density terminals, log analysis',
    popularTools: ['IBM Cloud Console', 'Carbon Design System', 'Terminal', 'Emacs'],
    sampleSnippet: 'function evaluateTelemetry(metric: string): { ok: boolean; latency: number }'
  },
  {
    id: 'inconsolata',
    name: 'Inconsolata',
    fontFamily: "'Inconsolata', monospace",
    category: 'monospace',
    categoryLabel: 'Micro-Typographic Balance',
    badge: 'Optical Density',
    creator: 'Raph Levien',
    year: '2006',
    researchFocus: 'Even Typographic Color & Prevention of Visual Clumping',
    scientificBasis: 'Inspired by Consolas and Auriol, designed with meticulous micro-typographic stroke balancing. Solves the "visual clumping" defect common in early monospace fonts where capitals and punctuation create heavy dark blotches. Produces a calm, harmonious visual texture that relaxes the reader’s peripheral vision.',
    keyFeatures: [
      'Engineered for even typographic color across broad editor widths',
      'Clean proportional punctuation marks and brackets',
      'Elegant, curved terminals preventing optical vibration',
      'Clear distinctions between parentheses, brackets, and braces'
    ],
    idealFor: 'Clean distraction-free editing, terminal viewing, dense text manipulation',
    popularTools: ['Vim', 'Linux Terminals', 'Markdown Viewers', 'Jupyter Lab'],
    sampleSnippet: 'SELECT user_id, COUNT(*) AS sessions FROM audit_events GROUP BY 1;'
  },
  {
    id: 'source-code-pro',
    name: 'Source Code Pro',
    fontFamily: "'Source Code Pro', monospace",
    category: 'monospace',
    categoryLabel: 'Adobe UI Engineering',
    badge: 'Internal Counter Clarity',
    creator: 'Paul D. Hunt (Adobe)',
    year: '2012',
    researchFocus: 'Internal Counter Space Geometry & High Contrast Anti-Aliasing',
    scientificBasis: 'Adobe’s open-source typeface built strictly for developer interfaces. Features generous internal counters (the negative space inside characters like o, e, d, p) and deliberate optical letter-spacing that eliminates adjacent glyph interference in both dark-mode and light-mode subpixel rendering engines.',
    keyFeatures: [
      'Expansive internal counter spaces preventing optical blur',
      'Slightly wider character bounding box for relaxed reading',
      'High distinction between curly braces and parentheses',
      'Optimized anti-aliasing on macOS and Windows ClearType'
    ],
    idealFor: 'Multi-column editor splits, prompt variable templates, structured logs',
    popularTools: ['Adobe Brackets', 'VS Code', 'Android Studio', 'Xcode'],
    sampleSnippet: 'export interface ModelConfig { temperature: 0.7; maxTokens: 4096; }'
  },
  {
    id: 'atkinson-hyperlegible',
    name: 'Atkinson Hyperlegible',
    fontFamily: "'Atkinson Hyperlegible', sans-serif",
    category: 'accessibility',
    categoryLabel: 'Clinical Accessibility',
    badge: 'Braille Institute Research',
    creator: 'Applied Design Works & Braille Institute',
    year: '2020',
    researchFocus: 'Low-Vision Ophthalmology & Character Differentiation Trials',
    scientificBasis: 'Scientifically designed in collaboration with ophthalmologists and vision scientists at the Braille Institute of America. Unlike conventional typefaces that prioritize geometric uniformity, Atkinson hyper-differentiates conflicting character pairs (e.g. angled loop on B vs round 8, crossbars on capital I, curved hook on 1, curved tail on capital Q). Clinically proven to minimize reading errors for people with visual fatigue, low vision, or cognitive strain.',
    keyFeatures: [
      'Clinically tested ophthalmological character hyper-differentiation',
      'Zero ambiguity across 1 / l / I and B / 8 and 0 / O',
      'Increased internal whitespace to prevent character bleeding',
      'Exceptional legibility for dyslexia, astigmatism, and eye strain'
    ],
    idealFor: 'Accessibility, cognitive clarity, reading long prompt guides, fatigue-free drafting',
    popularTools: ['Braille Institute Tools', 'Educational Systems', 'Accessibility Readers'],
    sampleSnippet: '1lI B8 0O: "Clarity over uniformity guarantees precision in every prompt."'
  },
  {
    id: 'inter',
    name: 'Inter',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    category: 'proportional',
    categoryLabel: 'Screen Reading Benchmark',
    badge: 'Industry Standard',
    creator: 'Rasmus Andersson',
    year: '2017',
    researchFocus: 'Computer Display Rasterization & Reading Cadence',
    scientificBasis: 'The modern benchmark for computer screen typography. Features a tall x-height, refined optical adjustments for rendering at small text sizes (12-16px), and contextual alternates. Eye-tracking benchmarks demonstrate Inter provides smooth horizontal saccadic flow and up to 15% faster information processing speed compared to legacy system fonts.',
    keyFeatures: [
      'Tall x-height optimized for 12-16px digital display readability',
      'Micro-typographic spacing preventing optical character collision',
      'Seamless transition between UI chrome and prose documentation',
      'Modern, neutral aesthetic preferred by leading productivity tools'
    ],
    idealFor: 'Google Docs / Notion style drafting, Markdown articles, prompt documentation',
    popularTools: ['Figma', 'Notion', 'GitHub', 'OpenAI ChatGPT', 'Linear'],
    sampleSnippet: 'Drafting structured instructions with effortless eye flow and natural pacing.'
  },
  {
    id: 'plus-jakarta-sans',
    name: 'Plus Jakarta Sans',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    category: 'proportional',
    categoryLabel: 'Modern Humanist',
    badge: 'Ergonomic Warmth',
    creator: 'Gumpita Rahayu & Tokotype',
    year: '2020',
    researchFocus: 'Humanist Geometric Balance & Saccadic Rhythm',
    scientificBasis: 'Blends geometric crispness with warm humanist apertures. Its balanced ascender-to-x-height ratio stabilizes the horizontal reading line, allowing the foveal gaze to glide effortlessly without the rigid robotic sterility of pure geometric sans-serifs.',
    keyFeatures: [
      'Warm humanist apertures promoting natural eye saccades',
      'Geometric skeleton with soft visual terminals',
      'High legibility across light and dark workspace themes',
      'Balanced letterforms that maintain cohesion in prose and titles'
    ],
    idealFor: 'Creative prompt writing, brainstorm notes, narrative drafting, clean notes',
    popularTools: ['Modern Web Apps', 'Figma Design Kits', 'Documentation Portals'],
    sampleSnippet: 'ContextPad combines deliberate craftsmanship with seamless visual rhythm.'
  },
  {
    id: 'literata',
    name: 'Literata',
    fontFamily: "'Literata', Georgia, serif",
    category: 'serif',
    categoryLabel: 'Continuous Immersion',
    badge: 'Book & Editorial',
    creator: 'TypeTogether (for Google)',
    year: '2015',
    researchFocus: 'Digital Long-Form Foveal Guidance & Regression Prevention',
    scientificBasis: 'Commissioned by Google specifically for sustained continuous reading on digital devices. Features robust low-contrast serifs, wide letter proportions, and deliberate diagonal stress that guide the eye continuously along horizontal text lines. Eye-tracking trials show serifs reduce backward saccadic regressions in long-form writing.',
    keyFeatures: [
      'Designed specifically for multi-hour continuous digital reading',
      'Sturdy low-contrast serifs that hold crisp edges on digital displays',
      'Natural horizontal baseline tracking reducing eye fatigue',
      'Graceful italics ideal for literary drafting and quotations'
    ],
    idealFor: 'Long-form essays, literary drafting, research notes, philosophy prompts',
    popularTools: ['Google Play Books', 'Editorial Publishers', 'E-Readers'],
    sampleSnippet: '“The purpose of abstraction is not to be vague, but to create a new semantic level.”'
  },
  {
    id: 'system-monospace',
    name: 'System Monospace',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    category: 'monospace',
    categoryLabel: 'Zero Latency Native',
    badge: 'OS Native Engine',
    creator: 'Apple / Microsoft / Linux Native',
    year: 'Native',
    researchFocus: 'Hardware-Accelerated Rasterization & Zero Network Latency',
    scientificBasis: 'Leverages the operating system’s pre-compiled, hardware-accelerated font rasterizer (SF Mono on macOS, Consolas/Cascadia on Windows, DejaVu on Linux). Guarantees instantaneous rendering with zero network requests, zero web-font reflows, and native sub-pixel anti-aliasing matching the user’s exact display profile.',
    keyFeatures: [
      'Zero network overhead or font loading delay',
      'Direct hardware-accelerated OS subpixel rendering',
      'Native desktop visual integration',
      'Maximum battery and memory efficiency'
    ],
    idealFor: 'Offline usage, native OS enthusiasts, minimalists, fast drafting',
    popularTools: ['macOS Terminal', 'Windows Terminal', 'Xcode', 'PowerShell'],
    sampleSnippet: 'npm run build && node --experimental-default-type=module server.ts'
  },
  {
    id: 'system-sans',
    name: 'System Sans (Google / Apple)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    category: 'proportional',
    categoryLabel: 'Native Desktop Standard',
    badge: 'Google Docs Standard',
    creator: 'Apple / Microsoft / Google',
    year: 'Native',
    researchFocus: 'Native Desktop Ergonomics & Familiar Cognitive Cadence',
    scientificBasis: 'Directly mirrors the host operating system’s primary user interface typography (San Francisco, Segoe UI, Roboto). Eliminates cognitive context switching between system windows, browser chrome, and editor content. Familiarity reduces subconscious mental overhead during rapid drafting.',
    keyFeatures: [
      'Matches the authentic Google Docs & native desktop feel',
      'Universal OS native rendering with zero download latency',
      'High familiarity reducing cognitive reading friction',
      'Adaptive to system-level accessibility zoom preferences'
    ],
    idealFor: 'Google Docs feel, quick scratchpad notes, seamless OS blending',
    popularTools: ['Google Docs', 'Apple Notes', 'Microsoft Word Web', 'Slack'],
    sampleSnippet: 'Seamlessly feels like your native operating system and Google Docs.'
  }
];

export function getCuratedFontById(id: string): CuratedFont {
  return CURATED_FONTS.find(f => f.id === id) || CURATED_FONTS[0];
}

export function getCuratedFontByFamily(family: string): CuratedFont {
  return CURATED_FONTS.find(f => f.fontFamily === family || family.includes(f.name)) || CURATED_FONTS[0];
}

/**
 * Default fitting font for each workspace theme.
 * Can be freely overridden by the user with any font.
 */
export const THEME_DEFAULT_FONTS: Record<ThemeName, string> = {
  'google-material-3': "'Plus Jakarta Sans', sans-serif",
  'parchment': "'Literata', Georgia, serif",
  'contextpad-dark': "'JetBrains Mono', monospace",
  'one-dark': "'Fira Code', monospace",
  'dracula': "'Fira Code', monospace",
  'nord': "'Source Code Pro', monospace",
  'monokai': "'Inconsolata', monospace",
  'github-dark': "'JetBrains Mono', monospace",
  'github-light': "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  'solarized-dark': "'IBM Plex Mono', monospace"
};

export function getThemeDefaultFont(theme: ThemeName): string {
  return THEME_DEFAULT_FONTS[theme] || "'JetBrains Mono', monospace";
}

