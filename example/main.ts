import {
  createCookieBanner,
  initCookieBanner,
  type CookieBannerAccent,
  type CookieBannerFont,
  type CookieBannerFontChoice,
  type CookieBannerHandle,
  type CookieBannerPosition,
  type CookieBannerRadius,
  type CookieBannerTheme,
} from '../src';
import { extractSiteStyle, loadFont } from './extract';

// In a real app you'd `import Clarity from '@microsoft/clarity'` and call
// `Clarity.init('YOUR_CLARITY_ID')` here. Kept as a stub so the demo runs with
// no extra dependencies.
function enableAnalytics(): void {
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
  }
  console.log('[analytics] enabled — load GA / Clarity here');
}

// ---------------------------------------------------------------------------
// Playground state — every control below mutates this and calls render().
// ---------------------------------------------------------------------------
const state = {
  theme: 'emerald' as CookieBannerAccent,
  font: 'sans' as CookieBannerFontChoice,
  radius: 'full' as CookieBannerRadius,
  position: 'bottom-left' as CookieBannerPosition,
};

// Current values behind the "Custom" controls.
let customAccent = '#7c3aed';
let customSurface = '#ffffff';
let customFamily = "'Inter', sans-serif";

// Assigned by the theme/font groups so the website importer can drive them.
let setCustomTheme: (next: { accent?: string; surface?: string }) => void = () => {};
let setCustomFont: (family: string) => void = () => {};

// `hex` is the palette's accent shade, used to seed the custom pickers so they
// reflect a named theme the moment you select it.
const THEMES: { value: CookieBannerTheme; dot: string; hex: string }[] = [
  { value: 'emerald', dot: 'bg-emerald-500', hex: '#059669' },
  { value: 'indigo', dot: 'bg-indigo-500', hex: '#4f46e5' },
  { value: 'violet', dot: 'bg-violet-500', hex: '#7c3aed' },
  { value: 'rose', dot: 'bg-rose-500', hex: '#e11d48' },
  { value: 'amber', dot: 'bg-amber-500', hex: '#f59e0b' },
  { value: 'sky', dot: 'bg-sky-500', hex: '#0284c7' },
  { value: 'slate', dot: 'bg-slate-800', hex: '#0f172a' },
];
const FONTS: CookieBannerFont[] = ['sans', 'serif', 'mono'];
const RADII: CookieBannerRadius[] = ['none', 'sm', 'md', 'lg', 'xl', 'full'];
// Laid out as a 3×2 grid mirroring the screen: top row then bottom row.
const POSITIONS: CookieBannerPosition[] = [
  'top-left', 'top-center', 'top-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

// ---------------------------------------------------------------------------
// Color helpers — pick a readable text color for a chosen card background.
// ---------------------------------------------------------------------------
function hexRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function readableText(hex: string): string | undefined {
  const rgb = hexRgb(hex);
  if (!rgb) return undefined;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? '#0f172a' : '#f8fafc';
}

// Build the custom theme object from the current accent/surface. Surface is
// only included when it differs from the default white (so the nice translucent
// default is preserved until you actually change the card color).
function buildCustomTheme(): CookieBannerAccent {
  const theme: { accent: string; accentText?: string; surface?: string; surfaceText?: string } = {
    accent: customAccent,
  };
  // Keep the accept-button label legible on any accent — including a light color
  // that lands on the button after swapping button/card.
  const at = readableText(customAccent);
  if (at) theme.accentText = at;
  if (customSurface && customSurface.toLowerCase() !== '#ffffff') {
    theme.surface = customSurface;
    const st = readableText(customSurface);
    if (st) theme.surfaceText = st;
  }
  return theme;
}

// ---------------------------------------------------------------------------
// Tiny DOM helpers.
// ---------------------------------------------------------------------------
function el(tag: string, className: string, html = ''): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

function fieldset(label: string, body: HTMLElement): HTMLElement {
  const wrap = el('div', '');
  wrap.append(
    el('div', 'text-xs font-medium uppercase tracking-wide text-slate-500 mb-2', label),
    body,
  );
  return wrap;
}

function colorField(label: string, onChange: (hex: string) => void): {
  row: HTMLElement;
  set: (hex: string) => void;
} {
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'h-8 w-10 rounded border border-slate-300 cursor-pointer bg-white p-0.5';
  const hex = document.createElement('input');
  hex.type = 'text';
  hex.className = 'w-28 px-2 py-1.5 text-sm rounded-lg border border-slate-300 font-mono';
  const row = el('div', 'flex items-center gap-2');
  row.append(el('span', 'text-sm text-slate-500 whitespace-nowrap', label), picker, hex);

  const set = (value: string) => {
    picker.value = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff';
    hex.value = value;
  };
  picker.addEventListener('input', () => { hex.value = picker.value; onChange(picker.value); });
  hex.addEventListener('change', () => onChange(hex.value.trim()));
  return { row, set };
}

const SWATCH = 'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors capitalize ';
const BTN_ON = 'border-slate-900 bg-slate-900 text-white';
const BTN_OFF = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100';

// A generic single-select button group bound to one key of `state`.
function buttonGroup<K extends keyof typeof state>(
  key: K,
  values: (typeof state)[K][],
  render: () => void,
): HTMLElement {
  const row = el('div', 'flex flex-wrap gap-2');
  const paint = () => {
    Array.from(row.children).forEach((child, i) => {
      const on = values[i] === state[key];
      (child as HTMLElement).className = SWATCH + (on ? BTN_ON : BTN_OFF);
    });
  };
  values.forEach((v) => {
    const b = el('button', SWATCH + BTN_OFF, String(v));
    b.setAttribute('type', 'button');
    b.addEventListener('click', () => { state[key] = v; paint(); render(); });
    row.append(b);
  });
  paint();
  return row;
}

function isCustomTheme(t: CookieBannerAccent): t is { accent: string } {
  return typeof t === 'object';
}

// Named palette swatches + always-visible accent (button) & card (surface)
// hex pickers, with a swap control. Picking a palette seeds the pickers with
// its color; editing a picker (or swapping) switches to a custom theme.
function themeGroup(render: () => void): HTMLElement {
  const wrap = el('div', 'space-y-3');
  const row = el('div', 'flex flex-wrap gap-2');

  const named = THEMES.map(({ value, dot }) => {
    const b = el('button', '', `<span class="inline-block w-3 h-3 rounded-full ${dot}"></span>${value}`);
    b.setAttribute('type', 'button');
    b.addEventListener('click', () => selectNamed(value));
    return b;
  });

  // Explicit "Custom" swatch — switches to a custom theme using the current
  // picker values, no website fetch or picker fiddling required.
  const customBtn = el('button', '', '<span class="inline-block w-3 h-3 rounded-full" style="background:conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)"></span>Custom');
  customBtn.setAttribute('type', 'button');
  customBtn.addEventListener('click', () => applyCustom({}));

  row.append(...named, customBtn);

  const accent = colorField('Button', (hex) => applyCustom({ accent: hex }));
  const surface = colorField('Card', (hex) => applyCustom({ surface: hex }));

  const swap = el('button', 'shrink-0 h-8 w-8 grid place-items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer', '⇄');
  swap.setAttribute('type', 'button');
  swap.setAttribute('title', 'Swap button and card colors');
  swap.setAttribute('aria-label', 'Swap button and card colors');
  swap.addEventListener('click', () => {
    [customAccent, customSurface] = [customSurface, customAccent];
    applyCustom({});
  });

  const state_ = el('span', 'text-xs text-slate-400', '');
  const pickerRow = el('div', 'flex flex-wrap items-center gap-x-4 gap-y-2');
  pickerRow.append(accent.row, swap, surface.row, state_);

  const applyCustom = (next: { accent?: string; surface?: string }) => {
    if (next.accent) customAccent = next.accent;
    if (next.surface) customSurface = next.surface;
    state.theme = buildCustomTheme();
    repaint();
    render();
  };
  const selectNamed = (value: CookieBannerTheme) => {
    state.theme = value;
    customAccent = THEMES.find((t) => t.value === value)?.hex ?? customAccent;
    customSurface = '#ffffff';
    repaint();
    render();
  };

  // Seed the pickers from the initial (named) theme before the first paint.
  if (typeof state.theme === 'string') {
    customAccent = THEMES.find((t) => t.value === state.theme)?.hex ?? customAccent;
    customSurface = '#ffffff';
  }

  wrap.append(row, pickerRow);

  function repaint() {
    const custom = isCustomTheme(state.theme);
    named.forEach((b, i) => (b.className = SWATCH + (THEMES[i].value === state.theme ? BTN_ON : BTN_OFF)));
    customBtn.className = SWATCH + (custom ? BTN_ON : BTN_OFF);
    accent.set(customAccent);
    surface.set(customSurface);
    state_.textContent = custom ? 'custom' : '';
  }
  repaint();

  setCustomTheme = applyCustom;
  return wrap;
}

function isCustomFont(f: CookieBannerFontChoice): f is { family: string } {
  return typeof f === 'object';
}

// Named stacks + a "Custom" button backed by a font-family text field.
function fontGroup(render: () => void): HTMLElement {
  const wrap = el('div', 'space-y-3');
  const row = el('div', 'flex flex-wrap gap-2');

  const named = FONTS.map((value) => {
    const b = el('button', '', value);
    b.setAttribute('type', 'button');
    b.addEventListener('click', () => { state.font = value; repaint(); render(); });
    return b;
  });

  const customBtn = el('button', '', 'Custom');
  customBtn.setAttribute('type', 'button');

  const family = document.createElement('input');
  family.type = 'text';
  family.placeholder = "'Inter', sans-serif";
  family.className = 'w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono';
  const customRow = el('div', 'pl-1');
  customRow.append(family);

  const applyCustom = (fam: string) => {
    customFamily = fam || customFamily;
    family.value = customFamily;
    state.font = { family: customFamily };
    repaint();
    render();
  };
  customBtn.addEventListener('click', () => applyCustom(family.value.trim() || customFamily));
  family.addEventListener('change', () => applyCustom(family.value.trim()));

  row.append(...named, customBtn);
  wrap.append(row, customRow);

  function repaint() {
    const custom = isCustomFont(state.font);
    named.forEach((b, i) => (b.className = SWATCH + (FONTS[i] === state.font ? BTN_ON : BTN_OFF)));
    customBtn.className = SWATCH + (custom ? BTN_ON : BTN_OFF);
    customRow.style.display = custom ? 'block' : 'none';
    family.value = customFamily;
  }
  repaint();

  setCustomFont = applyCustom;
  return wrap;
}

// Position picker rendered as a 3×2 grid you can click like a screen map.
function positionGrid(render: () => void): HTMLElement {
  const grid = el('div', 'grid grid-cols-3 gap-2 max-w-xs');
  const paint = () => {
    Array.from(grid.children).forEach((child, i) => {
      const on = POSITIONS[i] === state.position;
      (child as HTMLElement).className =
        'h-12 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-center ' +
        (on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100');
    });
  };
  POSITIONS.forEach((pos) => {
    const [v, h] = pos.split('-');
    const b = el('button', '', `${v}<br>${h}`);
    b.setAttribute('type', 'button');
    b.addEventListener('click', () => { state.position = pos; paint(); render(); });
    grid.append(b);
  });
  paint();
  return grid;
}

// ---------------------------------------------------------------------------
// "Pull styles from a website" — fetch a URL, extract its accent/card colors +
// font, and apply them (as a custom theme + custom font). Best-effort; depends
// on the target site's CORS headers / the fallback proxies (see extract.ts).
// ---------------------------------------------------------------------------
function websiteImporter(render: () => void): HTMLElement {
  const wrap = el('div', 'space-y-2');
  const rowEl = el('div', 'flex flex-wrap items-center gap-2');

  const input = document.createElement('input');
  input.type = 'url';
  input.placeholder = 'stripe.com';
  input.className = 'flex-1 min-w-[12rem] px-3 py-2 text-sm rounded-lg border border-slate-300';

  const btn = el('button', 'px-4 py-2 rounded-lg bg-slate-900 text-white text-sm cursor-pointer hover:bg-slate-700 transition-colors disabled:opacity-50', 'Pull styles');
  btn.setAttribute('type', 'button');

  const status = el('div', 'text-xs text-slate-500 min-h-[1rem]');

  const run = async () => {
    const url = input.value.trim();
    if (!url) return;
    (btn as HTMLButtonElement).disabled = true;
    status.className = 'text-xs text-slate-500 min-h-[1rem]';
    status.textContent = 'Fetching…';
    try {
      const s = await extractSiteStyle(url);
      const bits: string[] = [];
      if (s.accent || s.surface) {
        // Replace the look with the site's: reset the card to the default when
        // the site defines no surface, so a previously-set card doesn't linger.
        setCustomTheme({ accent: s.accent, surface: s.surface ?? '#ffffff' });
        if (s.accent) bits.push(`accent ${s.accent}`);
        bits.push(s.surface ? `card ${s.surface}` : 'card default');
      }
      if (s.fontFamily) {
        if (s.googleFontHref) loadFont(s.googleFontHref);
        setCustomFont(s.fontFamily); // fetched font is applied as a custom font
        bits.push(`font ${s.fontFamily}`);
      }
      render();
      status.textContent = bits.length
        ? `Applied ${bits.join(' · ')}  (via ${s.via})`
        : `Fetched (via ${s.via}) but found no obvious accent/card/font. Try another site.`;
    } catch (err) {
      status.className = 'text-xs text-rose-600 min-h-[1rem]';
      status.textContent = String(err instanceof Error ? err.message : err);
    } finally {
      (btn as HTMLButtonElement).disabled = false;
    }
  };

  btn.addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') run();
  });

  rowEl.append(input, btn);
  wrap.append(
    rowEl,
    status,
    el('div', 'text-xs text-slate-400', 'Grabs the site’s theme-color / brand & background CSS vars and its font. Needs the site to allow cross-origin fetches (falls back to a public proxy).'),
  );
  return wrap;
}

// ---------------------------------------------------------------------------
// Render: (re)mount the banner INSIDE the preview box from current state, and
// refresh the code snippet. initCookieBanner reuses the element we insert (it
// only creates one when #cookie-banner is absent), so it stays in the box.
// ---------------------------------------------------------------------------
let handle: CookieBannerHandle;
const preview = document.getElementById('preview')!;

const lit = (v: unknown): string => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v));

function updateSnippet(): void {
  const snippet = document.getElementById('snippet')!;
  snippet.textContent = `initCookieBanner({
  theme: ${lit(state.theme)},
  font: ${lit(state.font)},
  radius: ${lit(state.radius)},
  position: ${lit(state.position)},
  onAccept: enableAnalytics,
});`;
}

function render(): void {
  document.getElementById('cookie-banner')?.remove();
  localStorage.removeItem('cookie_consent');
  const opts = {
    ...state,
    onAccept: enableAnalytics,
    onDecline: () => console.log('[analytics] declined'),
  };
  preview.insertAdjacentHTML('beforeend', createCookieBanner(opts));
  handle = initCookieBanner(opts);
  updateSnippet();
}

// ---------------------------------------------------------------------------
// Mount controls, wire the demo buttons, and do the first render.
// ---------------------------------------------------------------------------
const controls = document.getElementById('controls')!;
controls.append(
  fieldset('Pull styles from a website', websiteImporter(render)),
  fieldset('Color theme', themeGroup(render)),
  fieldset('Font', fontGroup(render)),
  fieldset('Button radius', buttonGroup('radius', RADII, render)),
  fieldset('Position', positionGrid(render)),
);

document.getElementById('reopen')?.addEventListener('click', () => handle.open());
document.getElementById('forget')?.addEventListener('click', () => handle.reset());

render();

// Minimal typing for the demo's use of the global gtag shim.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
