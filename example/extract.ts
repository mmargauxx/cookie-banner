// Best-effort "steal the look of a site" helper for the playground.
//
// Given a URL, fetch its HTML and pull out an accent color and a font family so
// the banner can mimic that site. This is a *demo* convenience, not part of the
// shipped library — most sites can't be fetched from the browser directly
// because of CORS, so we fall back to public read-only CORS proxies. Nothing is
// sent anywhere until the visitor clicks the button and types a URL.

export interface SiteStyle {
  /** Accent color (hex / rgb / hsl), if one could be found. */
  accent?: string;
  /** Card/surface background color, if one could be found. */
  surface?: string;
  /** CSS `font-family` value, if one could be found. */
  fontFamily?: string;
  /** A Google Fonts stylesheet href to inject so the font actually loads. */
  googleFontHref?: string;
  /** How the HTML was retrieved — shown to the user. */
  via: string;
}

// Tried in order: straight fetch first (works for CORS-friendly sites), then a
// couple of public proxies as a fallback.
const TRANSPORTS: { label: string; url: (u: string) => string }[] = [
  { label: 'direct', url: (u) => u },
  { label: 'allorigins proxy', url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  { label: 'corsproxy.io', url: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
];

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function fetchHtml(url: string): Promise<{ html: string; via: string }> {
  let lastErr: unknown;
  for (const t of TRANSPORTS) {
    try {
      const res = await fetch(t.url(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html && html.length > 0) return { html, via: t.label };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Couldn't fetch that site (CORS / network). Last error: ${String(lastErr)}`,
  );
}

// --- extraction heuristics -------------------------------------------------

function findAccent(doc: Document, html: string): string | undefined {
  // 1) The site's own declared theme color.
  const meta =
    doc.querySelector('meta[name="theme-color"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="msapplication-TileColor"]')?.getAttribute('content');
  if (meta) return meta.trim();

  // 2) A CSS custom property that looks like a brand/primary/accent color.
  const varMatch = html.match(
    /--[\w-]*(?:primary|brand|accent|main|theme)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))/i,
  );
  if (varMatch) return varMatch[1].trim();

  // 3) First explicit hex used as a background in an inline <style>.
  const bgMatch = html.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{6})/i);
  if (bgMatch) return bgMatch[1].trim();

  return undefined;
}

const COLOR = String.raw`#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)`;

// A small map of the Tailwind gray/neutral background classes sites actually
// use for page backgrounds, so a `bg-slate-950` on <body> becomes a real color.
const TW_BG: Record<string, string> = {
  white: '#ffffff', black: '#000000',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-900': '#0f172a', 'slate-950': '#020617',
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-900': '#111827', 'gray-950': '#030712',
  'zinc-50': '#fafafa', 'zinc-900': '#18181b', 'zinc-950': '#09090b',
  'neutral-50': '#fafafa', 'neutral-900': '#171717', 'neutral-950': '#0a0a0a',
  'stone-50': '#fafaf9', 'stone-900': '#1c1917', 'stone-950': '#0c0a09',
};

function twBgFromClasses(classAttr: string): string | undefined {
  const classes = classAttr.split(/\s+/).map((c) => c.replace(/^(?:dark|sm|md|lg|xl):/, ''));
  // Arbitrary value first: bg-[#0b1020] / bg-[rgb(...)].
  for (const c of classes) {
    const arb = c.match(/^bg-\[(#[0-9a-fA-F]{3,8})\]$/i);
    if (arb) return arb[1];
  }
  // Then a known named background utility.
  for (const c of classes) {
    if (c.startsWith('bg-') && TW_BG[c.slice(3)]) return TW_BG[c.slice(3)];
  }
  return undefined;
}

function findSurface(doc: Document, html: string): string | undefined {
  // 1) A CSS custom property that reads like a page/card/surface background.
  const varMatch = html.match(new RegExp(`--[\\w-]*(?:background|surface|card|bg|paper)[\\w-]*\\s*:\\s*(${COLOR})`, 'i'));
  if (varMatch) return varMatch[1].trim();

  // 2) A `body {}` or `html {}` background rule in an inline <style>.
  const ruleMatch = html.match(new RegExp(`(?:body|html)\\s*\\{[^}]*?background(?:-color)?\\s*:\\s*(${COLOR})`, 'i'));
  if (ruleMatch) return ruleMatch[1].trim();

  // 3) The <body> element itself: inline style, then Tailwind class hints.
  const body = doc.body;
  if (body) {
    const style = body.getAttribute('style');
    const inline = style?.match(new RegExp(`background(?:-color)?\\s*:\\s*(${COLOR})`, 'i'));
    if (inline) return inline[1].trim();

    const fromClass = twBgFromClasses(body.getAttribute('class') || '');
    if (fromClass) return fromClass;
  }

  return undefined;
}

function findFont(doc: Document, html: string): { fontFamily?: string; googleFontHref?: string } {
  // 1) A Google Fonts <link> — gives us both the family name and a way to load it.
  const gLink = Array.from(doc.querySelectorAll('link[href*="fonts.googleapis.com/css"]'))
    .map((l) => l.getAttribute('href'))
    .find(Boolean);
  if (gLink) {
    const href = gLink.startsWith('//') ? `https:${gLink}` : gLink;
    const family = new URL(href, 'https://x').searchParams.get('family');
    // `family` looks like "Inter:wght@400;700" or "Inter+Tight" — take the name.
    const name = family?.split(':')[0].split('&')[0].replace(/\+/g, ' ').trim();
    if (name) return { fontFamily: `'${name}', sans-serif`, googleFontHref: href };
  }

  // 2) Otherwise, the first non-variable font-family declared inline.
  const fm = html.match(/font-family\s*:\s*([^;}{"']+)/i);
  if (fm && !fm[1].includes('var(')) return { fontFamily: fm[1].trim() };

  return {};
}

export async function extractSiteStyle(rawUrl: string): Promise<SiteStyle> {
  const url = normalizeUrl(rawUrl);
  const { html, via } = await fetchHtml(url);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return { accent: findAccent(doc, html), surface: findSurface(doc, html), ...findFont(doc, html), via };
}

/** Inject a Google Fonts stylesheet once so an extracted font actually renders. */
export function loadFont(href: string): void {
  if (document.querySelector(`link[data-cb-font][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-cb-font', '');
  document.head.append(link);
}
