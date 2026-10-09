import { SIZE_SOFT_BYTES, SIZE_HARD_BYTES } from './limits';

export type FindingSeverity = 'info' | 'warn' | 'block';

export interface Finding {
  id: string;
  severity: FindingSeverity;
  message: string;
  detail?: string[];
}

export interface Contributor {
  label: string;
  bytes: number;
}

export interface PreflightResult {
  bytes: number;
  externalRefs: string[];
  offlineReady: boolean;
  contributors: Contributor[];
  findings: Finding[];
  blocked: boolean;
}

const bytesOf = (s: string) => new TextEncoder().encode(s).length;
const isExternal = (u: string) => /^(https?:)?\/\//i.test(u.trim());

export function scanHtml(html: string): PreflightResult {
  const total = bytesOf(html);
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // external references: attributes
  const refs = new Set<string>();
  doc.querySelectorAll('[src],[href]').forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'a') return; // plain links do not load external resources
    const v = el.getAttribute('src') ?? el.getAttribute('href') ?? '';
    if (isExternal(v)) refs.add(v.trim());
  });

  doc.querySelectorAll('[srcset]').forEach((el) => {
    el.getAttribute('srcset')!
      .split(',')
      .forEach((p) => {
        const u = p.trim().split(/\s+/)[0];
        if (isExternal(u)) refs.add(u);
      });
  });

  // external references: css and js text
  for (const m of html.matchAll(/@import\s+(?:url\()?['"]?(https?:\/\/[^'")\s]+)/gi)) {
    refs.add(m[1]);
  }
  for (const m of html.matchAll(/url\(\s*['"]?(https?:\/\/[^'")\s]+)/gi)) {
    refs.add(m[1]);
  }
  for (const m of html.matchAll(/\b(?:fetch|import)\s*\(\s*['"`](https?:\/\/[^'"`]+)/g)) {
    refs.add(m[1]);
  }
  for (const m of html.matchAll(/\.open\(\s*['"][A-Z]+['"]\s*,\s*['"](https?:\/\/[^'"]+)/g)) {
    refs.add(m[1]);
  }

  // contributors: biggest chunks first
  const contributors: Contributor[] = [];
  doc.querySelectorAll('script:not([src])').forEach((el, i) =>
    contributors.push({ label: `Inline script #${i + 1}`, bytes: bytesOf(el.textContent ?? '') })
  );
  doc.querySelectorAll('style').forEach((el, i) =>
    contributors.push({ label: `Inline style #${i + 1}`, bytes: bytesOf(el.textContent ?? '') })
  );
  for (const m of html.matchAll(/data:([a-z]+\/[a-z0-9.+-]+);base64,[A-Za-z0-9+/=]+/gi)) {
    contributors.push({ label: `Embedded ${m[1]}`, bytes: m[0].length });
  }
  contributors.sort((a, b) => b.bytes - a.bytes);

  // findings
  const findings: Finding[] = [];
  if (total > SIZE_HARD_BYTES) {
    findings.push({ id: 'size-hard', severity: 'block', message: 'App exceeds maximum size (2MB limit)' });
  } else if (total > SIZE_SOFT_BYTES) {
    findings.push({ id: 'size-soft', severity: 'warn', message: 'Large app (>512KB), initial render may take a moment' });
  }

  if (refs.size > 0) {
    findings.push({
      id: 'external',
      severity: 'warn',
      message: 'Loads external scripts or assets over the network',
      detail: [...refs],
    });
  }

  if (!/<!doctype html/i.test(html)) {
    findings.push({ id: 'doctype', severity: 'info', message: 'Missing <!doctype html>' });
  }
  if (!doc.querySelector('meta[name="viewport"]')) {
    findings.push({ id: 'viewport', severity: 'info', message: 'No viewport meta; layout may appear unscaled in narrow panels' });
  }
  if (/\b(window\.)?(parent|top)\.(postMessage|document|location)/.test(html)) {
    findings.push({ id: 'parent', severity: 'warn', message: 'Uses window.parent or top, which are restricted in sandboxed panel views' });
  }

  return {
    bytes: total,
    externalRefs: [...refs],
    offlineReady: refs.size === 0,
    contributors: contributors.slice(0, 5),
    findings,
    blocked: findings.some((f) => f.severity === 'block'),
  };
}
