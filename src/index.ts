// @mmargauxx/cookie-banner — reusable consent banner (vanilla JS/TS + Tailwind).
//
// initCookieBanner({
//   onAccept, onDecline,                  // callbacks
//   storageKey: 'cookie_consent',         // localStorage key
//   text: 'We use analytics cookies...',  // body copy (HTML allowed)
//   policyHref: '/cookies',               // "learn more" link target
//   policyLabel: 'Learn more',
//   acceptLabel: 'Accept',
//   declineLabel: 'Decline',
//   theme: 'emerald',                     // accent color (accept button + link)
//   font: 'sans',                         // 'sans' | 'serif' | 'mono'
//   radius: 'full',                       // button corner radius
//   position: 'bottom-left',              // where it sits on screen
//   classes: { ... },                     // override every element's classes
// }) -> { open, close, reset }
//
// Styling uses Tailwind utility classes baked into the markup. The defaults use
// stock Tailwind palette colors (slate/emerald), so the banner renders correctly
// in any project that runs Tailwind. See the README for the `content` glob you
// must add so these classes aren't purged.

/** The set of overridable class strings, one per element of the banner. */
export interface CookieBannerClasses {
  /** Outer fixed-position container (`role="dialog"`). */
  wrapper: string;
  /** Body copy paragraph. */
  text: string;
  /** "Learn more" policy link. */
  link: string;
  /** Row wrapping the two action buttons. */
  actions: string;
  /** Decline button. */
  decline: string;
  /** Accept button. */
  accept: string;
}

/** Accent color theme — drives the accept button and policy link. */
export type CookieBannerTheme =
  | 'emerald'
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'slate';

/**
 * A bring-your-own accent, given as CSS colors (hex, `rgb()`, `hsl()`, …). Pass
 * this as `theme` instead of a named palette. The colors are applied via a
 * `<style>` block scoped to the banner, so `:hover` works too.
 */
export interface CookieBannerCustomTheme {
  /** Accent: accept-button background and policy-link color. Any CSS color. */
  accent: string;
  /** Hover shade. Defaults to `accent` darkened ~12% via `color-mix`. */
  accentHover?: string;
  /** Text/foreground color on the accept button. Default `'#fff'`. */
  accentText?: string;
  /** Card background color. Defaults to the built-in translucent white. */
  surface?: string;
  /** Body text / decline-button color on the card. Set for dark surfaces. */
  surfaceText?: string;
}

/** A named palette or a custom {@link CookieBannerCustomTheme}. */
export type CookieBannerAccent = CookieBannerTheme | CookieBannerCustomTheme;

/** Named font stack applied to the whole banner. */
export type CookieBannerFont = 'sans' | 'serif' | 'mono';

/**
 * A bring-your-own font, given as a CSS `font-family` value, e.g.
 * `{ family: "'Inter', sans-serif" }`. Pass as `font` instead of a named stack.
 * You are responsible for the font actually being loaded on the page.
 */
export interface CookieBannerCustomFont {
  /** Any CSS `font-family` value. */
  family: string;
}

/** A named stack or a custom {@link CookieBannerCustomFont}. */
export type CookieBannerFontChoice = CookieBannerFont | CookieBannerCustomFont;

/** Corner radius applied to the action buttons. */
export type CookieBannerRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/** Where the banner is anchored on screen. */
export type CookieBannerPosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'top-left'
  | 'top-right'
  | 'top-center';

// Full literal Tailwind class strings per accent theme (no interpolation), so
// they survive Tailwind's content scan / purge — same reason the base classes
// are baked in as literals below.
const THEMES: Record<CookieBannerTheme, { link: string; accept: string }> = {
  emerald: { link: 'text-emerald-600 hover:text-emerald-700', accept: 'bg-emerald-600 hover:bg-emerald-700' },
  indigo: { link: 'text-indigo-600 hover:text-indigo-700', accept: 'bg-indigo-600 hover:bg-indigo-700' },
  violet: { link: 'text-violet-600 hover:text-violet-700', accept: 'bg-violet-600 hover:bg-violet-700' },
  rose: { link: 'text-rose-600 hover:text-rose-700', accept: 'bg-rose-600 hover:bg-rose-700' },
  amber: { link: 'text-amber-600 hover:text-amber-700', accept: 'bg-amber-500 hover:bg-amber-600' },
  sky: { link: 'text-sky-600 hover:text-sky-700', accept: 'bg-sky-600 hover:bg-sky-700' },
  slate: { link: 'text-slate-700 hover:text-slate-900', accept: 'bg-slate-900 hover:bg-slate-700' },
};

const FONTS: Record<CookieBannerFont, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

// Button corner radius. Names are size-relative, mapped to concrete Tailwind
// `rounded-*` utilities (kept as literals so they aren't purged).
const RADII: Record<CookieBannerRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
};

// Screen anchoring. On small viewports the banner spans the gutters; from `sm`
// up it snaps to the chosen corner/edge at a fixed max width. Literals only.
const POSITIONS: Record<CookieBannerPosition, string> = {
  'bottom-left': 'bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto',
  'bottom-right': 'bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto',
  'bottom-center': 'bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2',
  'top-left': 'top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-auto',
  'top-right': 'top-4 left-4 right-4 sm:top-6 sm:right-6 sm:left-auto',
  'top-center': 'top-4 left-4 right-4 sm:top-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2',
};

function isCustomTheme(theme: CookieBannerAccent): theme is CookieBannerCustomTheme {
  return typeof theme === 'object' && theme !== null;
}

function isCustomFont(font: CookieBannerFontChoice): font is CookieBannerCustomFont {
  return typeof font === 'object' && font !== null;
}

// Allow only characters that can legitimately appear in a CSS color value, so a
// stray `</style>` / `{` / `;` in a config value can't break out of the style
// block. Config is developer-supplied (like `text`), but this keeps it tidy.
function cssSafe(value: string): string {
  return String(value).replace(/[^a-zA-Z0-9#%(),.\-/ ]/g, '');
}

// Same idea for a font-family value — additionally allow the quotes that wrap
// multi-word family names. Still strips `<`, `>`, `;`, `{`, `}`.
function fontSafe(value: string): string {
  return String(value).replace(/[^a-zA-Z0-9 ,.\-_'"]/g, '');
}

/**
 * Build a `<style>` block scoped to `#cookie-banner` for whichever of the
 * accent / font are custom. Named palettes and stacks are handled purely with
 * Tailwind classes, so this returns `''` when neither is custom.
 */
function customStyleBlock(theme: CookieBannerAccent, font: CookieBannerFontChoice): string {
  const rules: string[] = [];
  if (isCustomFont(font)) {
    rules.push(`#cookie-banner{font-family:${fontSafe(font.family)}}`);
  }
  if (isCustomTheme(theme)) {
    const accent = cssSafe(theme.accent);
    const hover = cssSafe(theme.accentHover ?? `color-mix(in srgb, ${theme.accent}, #000 12%)`);
    const text = cssSafe(theme.accentText ?? '#fff');
    rules.push(
      `#cookie-banner [data-cookie-accept]{background:${accent};color:${text}}`,
      `#cookie-banner [data-cookie-accept]:hover{background:${hover}}`,
      `#cookie-banner [data-cookie-link]{color:${accent}}`,
      `#cookie-banner [data-cookie-link]:hover{color:${hover}}`,
    );
    if (theme.surface) {
      rules.push(`#cookie-banner{background:${cssSafe(theme.surface)}}`);
    }
    if (theme.surfaceText) {
      const st = cssSafe(theme.surfaceText);
      rules.push(
        `#cookie-banner [data-cookie-text]{color:${st}}`,
        `#cookie-banner [data-cookie-decline]{color:${st}}`,
      );
    }
  }
  return rules.length ? `<style>${rules.join('')}</style>` : '';
}

/** Options for {@link initCookieBanner} and {@link createCookieBanner}. */
export interface CookieBannerOptions {
  /** Called after the visitor accepts (and consent is persisted). */
  onAccept?: (() => void) | null;
  /** Called after the visitor declines (and the choice is persisted). */
  onDecline?: (() => void) | null;
  /** `localStorage` key the decision is stored under. */
  storageKey?: string;
  /** Body copy. HTML is allowed and rendered as-is. */
  text?: string;
  /** Target for the "learn more" link. Pass `''`/`null` to omit the link. */
  policyHref?: string | null;
  /** Visible label for the policy link. */
  policyLabel?: string;
  /** Visible label for the accept button. */
  acceptLabel?: string;
  /** Visible label for the decline button. */
  declineLabel?: string;
  /**
   * Accent for the accept button and policy link. Either a named palette
   * (`'emerald'`, `'indigo'`, …) or a custom {@link CookieBannerCustomTheme} of
   * CSS colors, e.g. `{ accent: '#7c3aed' }`. Default `'emerald'`.
   */
  theme?: CookieBannerAccent;
  /**
   * Font for the banner: a named stack (`'sans'`, `'serif'`, `'mono'`) or a
   * custom {@link CookieBannerCustomFont}, e.g. `{ family: "'Inter', sans-serif" }`.
   * Default `'sans'`.
   */
  font?: CookieBannerFontChoice;
  /** Corner radius of the action buttons. Default `'full'`. */
  radius?: CookieBannerRadius;
  /** Where the banner is anchored on screen. Default `'bottom-left'`. */
  position?: CookieBannerPosition;
  /**
   * Override any subset of the per-element class strings. Applied *after*
   * `theme`/`font`/`radius`, so an override always wins over a theme.
   */
  classes?: Partial<CookieBannerClasses>;
}

/** Imperative handles returned by {@link initCookieBanner}. */
export interface CookieBannerHandle {
  /** Show the banner. */
  open: () => void;
  /** Hide the banner. */
  close: () => void;
  /** Clear the stored decision and re-open the banner. */
  reset: () => void;
}

type ResolvedOptions = Required<Omit<CookieBannerOptions, 'classes' | 'policyHref'>> & {
  policyHref: string | null;
  classes: CookieBannerClasses;
};

const DEFAULTS: Omit<ResolvedOptions, 'classes'> = {
  storageKey: 'cookie_consent',
  text: 'We use analytics cookies to improve your visit.',
  policyHref: '/cookies',
  policyLabel: 'Learn more',
  acceptLabel: 'Accept',
  declineLabel: 'Decline',
  theme: 'emerald',
  font: 'sans',
  radius: 'full',
  position: 'bottom-left',
  onAccept: null,
  onDecline: null,
};

/**
 * Compose the per-element default classes from an accent `theme`, a `font`
 * family, and a button `radius`. User `classes` overrides are layered on top of
 * whatever this returns (see {@link resolve}).
 */
function buildClasses(
  theme: CookieBannerAccent,
  font: CookieBannerFontChoice,
  radius: CookieBannerRadius,
  position: CookieBannerPosition,
): CookieBannerClasses {
  const r = RADII[radius];
  // Named stack → Tailwind class; custom family → colored via customStyleBlock().
  const f = isCustomFont(font) ? '' : FONTS[font];
  const p = POSITIONS[position];
  // Named palettes carry their color as Tailwind utilities; a custom accent
  // leaves those out (the style block from customStyleBlock() colors it).
  const custom = isCustomTheme(theme);
  const t = custom ? { link: '', accept: '' } : THEMES[theme];
  const acceptText = custom ? '' : 'text-white';
  // Drop the default card background when a custom surface color is supplied.
  const surface = custom && theme.surface ? '' : 'bg-white/95';
  return {
    wrapper:
      `${f} fixed z-[9999] ${p} sm:max-w-xs ` +
      `rounded-2xl border border-slate-200 ${surface} backdrop-blur-xl shadow-xl shadow-slate-900/10 ` +
      'p-5 transition-opacity duration-300',
    text: 'text-sm text-slate-700 leading-relaxed mb-4',
    link: `${t.link} underline underline-offset-2 transition-colors`.trim(),
    actions: 'flex items-center gap-3',
    decline: `${r} px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer`,
    accept:
      `flex-1 ${t.accept} ${r} ${acceptText} px-5 py-2.5 text-sm font-medium `.replace(/\s+/g, ' ') +
      'transition-colors duration-300 cursor-pointer',
  };
}

function resolve(opts: CookieBannerOptions): ResolvedOptions {
  const theme = opts.theme ?? DEFAULTS.theme;
  const font = opts.font ?? DEFAULTS.font;
  const radius = opts.radius ?? DEFAULTS.radius;
  const position = opts.position ?? DEFAULTS.position;
  return {
    ...DEFAULTS,
    ...opts,
    theme,
    font,
    radius,
    position,
    classes: { ...buildClasses(theme, font, radius, position), ...(opts.classes || {}) },
  };
}

/**
 * Build the banner's HTML markup as a string, ready to inject. Useful for SSR
 * or when you want to control where/when the element is inserted.
 */
export function createCookieBanner(opts: CookieBannerOptions = {}): string {
  const o = resolve(opts);
  const c = o.classes;
  // Empty for named presets; a scoped <style> block for a custom accent/font.
  const accentStyle = customStyleBlock(o.theme, o.font);
  return /*html*/ `
    <div id="cookie-banner" role="dialog" aria-label="Cookie consent" aria-hidden="true" inert
      class="${c.wrapper}" style="opacity:0;pointer-events:none">
      ${accentStyle}
      <p data-cookie-text class="${c.text}">
        ${o.text}
        ${o.policyHref ? `<a data-cookie-link class="${c.link}" href="${o.policyHref}">${o.policyLabel}</a>` : ''}
      </p>
      <div class="${c.actions}">
        <button type="button" data-cookie-decline class="${c.decline}">${o.declineLabel}</button>
        <button type="button" data-cookie-accept class="${c.accept}">${o.acceptLabel}</button>
      </div>
    </div>`;
}

/**
 * Mount the banner (if not already present), wire up the accept/decline
 * buttons, and open it when no decision has been stored yet.
 *
 * @returns handles to {@link CookieBannerHandle.open | open},
 * {@link CookieBannerHandle.close | close}, and
 * {@link CookieBannerHandle.reset | reset} the banner — e.g. to re-open it from
 * a footer "cookie settings" link.
 */
export function initCookieBanner(opts: CookieBannerOptions = {}): CookieBannerHandle {
  const o = resolve(opts);

  let banner = document.getElementById('cookie-banner');
  if (!banner) {
    document.body.insertAdjacentHTML('beforeend', createCookieBanner(opts));
    banner = document.getElementById('cookie-banner')!;
  }

  // Hidden = transparent (so it can fade) *and* `inert`, so the invisible
  // buttons/link can't be tabbed to, focused, or clicked.
  const open = (): void => {
    banner!.removeAttribute('inert');
    banner!.style.opacity = '1';
    banner!.style.pointerEvents = 'auto';
    banner!.setAttribute('aria-hidden', 'false');
  };
  const close = (): void => {
    banner!.style.opacity = '0';
    banner!.style.pointerEvents = 'none';
    banner!.setAttribute('aria-hidden', 'true');
    banner!.setAttribute('inert', '');
  };
  const choose = (value: string, cb: (() => void) | null): void => {
    localStorage.setItem(o.storageKey, value);
    close();
    if (typeof cb === 'function') cb();
  };

  banner.querySelector('[data-cookie-accept]')!
    .addEventListener('click', () => choose('accepted', o.onAccept));
  banner.querySelector('[data-cookie-decline]')!
    .addEventListener('click', () => choose('declined', o.onDecline));

  if (!localStorage.getItem(o.storageKey)) open();

  // Return handles so callers can re-open it (withdraw consent), close, or reset.
  const reset = (): void => {
    localStorage.removeItem(o.storageKey);
    open();
  };
  return { open, close, reset };
}

/**
 * Every Tailwind utility class the banner can emit across all *named* presets
 * (themes × fonts × radii × positions), de-duplicated. Custom `theme`/`font`
 * objects paint via inline styles, not classes, so they need no safelisting.
 *
 * Prefer adding the package to your Tailwind `content` globs (or the shipped
 * `tailwind-preset`) — content scanning captures variant-prefixed classes most
 * reliably. Use this when your build can't scan `node_modules` and you want an
 * explicit `safelist` that always tracks the source.
 */
export function getCookieBannerSafelist(): string[] {
  const set = new Set<string>();
  const add = (s: string): void => {
    for (const cls of s.split(/\s+/)) if (cls) set.add(cls);
  };
  const themes = Object.keys(THEMES) as CookieBannerTheme[];
  const fonts = Object.keys(FONTS) as CookieBannerFont[];
  const radii = Object.keys(RADII) as CookieBannerRadius[];
  const positions = Object.keys(POSITIONS) as CookieBannerPosition[];
  for (const theme of themes)
    for (const font of fonts)
      for (const radius of radii)
        for (const position of positions) {
          const c = buildClasses(theme, font, radius, position);
          add(c.wrapper);
          add(c.text);
          add(c.link);
          add(c.actions);
          add(c.decline);
          add(c.accept);
        }
  return [...set].sort();
}
