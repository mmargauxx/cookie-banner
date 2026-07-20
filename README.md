# @mmargauxx/cookie-banner

A tiny, framework-agnostic **cookie consent banner** in vanilla JS/TS, styled with Tailwind. Everything is configurable — copy, links, callbacks, and the classes on every element — and `initCookieBanner` returns `{ open, close, reset }` handles so you can re-open it later (e.g. from a footer "cookie settings" link) without relying on a global.

- **No runtime dependencies.** ~1 kB.
- **Consent-Mode-v2 friendly.** You decide what `onAccept` enables.
- **Themeable.** Stock Tailwind palette defaults; override any class.
- **Typed.** Ships ESM + CJS + `.d.ts`.

```bash
npm install @mmargauxx/cookie-banner
```

## Usage

```ts
import { initCookieBanner } from '@mmargauxx/cookie-banner';

const banner = initCookieBanner({
  text: 'We use analytics cookies to improve your visit.',
  policyHref: '/cookies',
  acceptLabel: 'Accept',
  declineLabel: 'Decline',
  onAccept: enableAnalytics,
});

// re-open from a footer link / policy page:
footerLink.addEventListener('click', banner.open);
```

The banner mounts itself to `document.body`, and only opens automatically when no decision has been stored yet. The choice is saved to `localStorage` under `storageKey`.

## Options

| Option | Type | Default |
| --- | --- | --- |
| `onAccept` | `() => void \| null` | `null` |
| `onDecline` | `() => void \| null` | `null` |
| `storageKey` | `string` | `'cookie_consent'` |
| `text` | `string` (HTML allowed) | `'We use analytics cookies to improve your visit.'` |
| `policyHref` | `string \| null` | `'/cookies'` — pass `null`/`''` to omit the link |
| `policyLabel` | `string` | `'Learn more'` |
| `acceptLabel` | `string` | `'Accept'` |
| `declineLabel` | `string` | `'Decline'` |
| `theme` | named palette **or** `{ accent, accentHover?, accentText?, surface?, surfaceText? }` | `'emerald'` |
| `font` | `'sans' \| 'serif' \| 'mono'` **or** `{ family }` | `'sans'` |
| `radius` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'full'` |
| `position` | `'bottom-left' \| 'bottom-right' \| 'bottom-center' \| 'top-left' \| 'top-right' \| 'top-center'` | `'bottom-left'` |
| `classes` | `Partial<CookieBannerClasses>` | stock Tailwind (see below) |

Named palettes: `emerald`, `indigo`, `violet`, `rose`, `amber`, `sky`, `slate`. These are convenience presets built from stock Tailwind classes. They set the defaults; any `classes` override you pass still wins over them. Spin up the playground (`npm run example`) to preview every combination live.

```ts
initCookieBanner({
  theme: 'indigo',        // accent color for the accept button + policy link
  font: 'serif',          // banner font family
  radius: 'md',           // action-button corner radius
  position: 'bottom-right',
});
```

### Custom colors & fonts

Pass an object to `theme` and/or `font` for a bring-your-own accent or typeface — no Tailwind color/font classes required. Custom values are applied through a small `<style>` block scoped to `#cookie-banner` (so `:hover` works), and are sanitized before injection.

```ts
initCookieBanner({
  theme: {
    accent: '#7c3aed',          // accept-button bg + link color — any CSS color
    accentHover: '#6d28d9',     // optional — defaults to accent darkened ~12%
    accentText: '#fff',         // optional — accept-button text, default #fff
    surface: '#0f172a',         // optional — card background (default: white)
    surfaceText: '#e2e8f0',     // optional — body/decline text (set for dark cards)
  },
  font: { family: "'Inter', sans-serif" }, // you load the font yourself
});
```

> The `font` object only sets the CSS `font-family`; make sure the font is actually loaded on your page (e.g. a `<link>` to Google Fonts or your own `@font-face`).

### Playground

`npm run example` opens a two-pane playground: options on the left, a live preview of the banner in a box on the right. It has **Custom** controls for both color (accent **and** card background) and font, plus a **"Pull styles from a website"** box — type a URL and it grabs that site's `theme-color` / brand & background CSS variables and its font, then applies them as a custom theme + custom font. That importer is a demo helper (in `example/`, not the shipped package) and depends on the target site allowing cross-origin fetches — it falls back to a public CORS proxy otherwise.

### Returns — `CookieBannerHandle`

| Handle | Effect |
| --- | --- |
| `open()` | Show the banner. |
| `close()` | Hide the banner. |
| `reset()` | Clear the stored decision and re-open. |

### `createCookieBanner(opts) → string`

Also exported: returns the banner's HTML as a string (no DOM side effects) if you want to control where/when it's inserted, or render it server-side.

## Styling

The defaults use **stock Tailwind palette classes** (`slate` / `emerald`), so the banner looks right in any project that runs Tailwind. Override any subset:

```ts
initCookieBanner({
  classes: {
    accept: 'flex-1 bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer',
    // wrapper, text, link, actions, decline are kept at their defaults
  },
});
```

Overridable keys: `wrapper`, `text`, `link`, `actions`, `decline`, `accept`.

### ⚠️ Tailwind purging

The banner's classes live inside this package's compiled JS, so Tailwind won't see them when scanning *your* source and will purge them. Pick **one** of the following.

**Option A — the shipped preset (recommended).** It adds this package's `dist` to your `content` *and* ships an explicit safelist, so nothing is missed:

```js
// tailwind.config.js  (Tailwind v3)
module.exports = {
  presets: [require('@mmargauxx/cookie-banner/tailwind-preset')],
  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
};
```

**Option B — a content glob** pointing at the package (works, but you maintain the path):

```js
content: [
  './src/**/*.{html,js,ts,jsx,tsx}',
  './node_modules/@mmargauxx/cookie-banner/dist/**/*.js',
],
```

**Option C — an explicit safelist.** For builds that can't/shouldn't scan `node_modules`. `getCookieBannerSafelist()` returns every class the banner can emit and is derived from the source, so it never drifts:

```js
const { getCookieBannerSafelist } = require('@mmargauxx/cookie-banner');
module.exports = { safelist: getCookieBannerSafelist() };
```

**Tailwind v4** (CSS-first, no JS config): add a source directive to your CSS instead —

```css
@source "../node_modules/@mmargauxx/cookie-banner/dist/**/*.js";
```

> None of this is needed if you override **all** the classes with your own (already-scanned) utilities. Not using Tailwind at all? Pass your own `classes` (or plain CSS class names) and ship the CSS yourself. Custom `theme`/`font` **objects** paint via an inline `<style>` block, not utility classes, so they're never purged.

## Wiring up analytics (Consent Mode v2)

Two pieces live in *your* app, not in this package.

**1. Set the Consent Mode v2 default in your document `<head>`**, before GA loads, so Google respects consent from the first paint:

```html
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied',
    ad_personalization: 'denied', analytics_storage: 'denied',
    wait_for_update: 500,
  });
  gtag('config', 'G-XXXX', { send_page_view: false });
</script>
```

**2. Flip consent on accept** (and re-enable on return visits):

```ts
import { initCookieBanner } from '@mmargauxx/cookie-banner';
import Clarity from '@microsoft/clarity';

function enableAnalytics() {
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
  }
  Clarity.init('YOUR_CLARITY_ID');
}

if (localStorage.getItem('cookie_consent') === 'accepted') enableAnalytics();
initCookieBanner({ onAccept: enableAnalytics });
```

## Development

```bash
npm install
npm run example     # interactive playground at http://localhost:5173
npm run build       # dist/ (esm + cjs + d.ts) via tsup
npm run typecheck
npm test            # vitest (jsdom)
```

## Publishing to npm

This is a public scoped package (`@mmargauxx/…`); `publishConfig.access` is already `"public"`, so no extra flag is needed.

**One-time setup**

```bash
npm login                       # authenticate (needs npm 2FA if enabled)
npm whoami                      # confirm you're the right user
```

**Every release**

1. Make sure the tree is clean and green:

   ```bash
   npm run typecheck && npm test && npm run build
   ```

2. Bump the version (updates `package.json` and creates a git tag):

   ```bash
   npm version patch      # 0.1.0 -> 0.1.1   (bug fixes)
   npm version minor      # 0.1.0 -> 0.2.0   (new features, backwards-compatible)
   npm version major      # 0.1.0 -> 1.0.0   (breaking changes)
   ```

3. Preview the exact tarball contents, then publish:

   ```bash
   npm publish --dry-run  # lists files that will ship — verify dist/ + tailwind-preset.cjs
   npm publish
   ```

4. Push the commit and tag:

   ```bash
   git push --follow-tags
   ```

**What gets published.** Only what's in the `files` allowlist: `dist/` (ESM + CJS + `.d.ts`), `tailwind-preset.cjs`, `README.md`, and `LICENSE`. Source, tests, and the example are excluded. `prepublishOnly` runs `npm run build` automatically, so `dist/` is always fresh — but run the checks in step 1 yourself first, since that hook only builds.

> **Notes**
> - `npm version` refuses to run with uncommitted changes — commit first.
> - To ship a prerelease without moving the `latest` tag: `npm version prerelease --preid=rc` then `npm publish --tag next`.
> - To pull a broken release within 72h: `npm unpublish @mmargauxx/cookie-banner@<version>` (prefer `npm deprecate` otherwise).

## License

MIT
