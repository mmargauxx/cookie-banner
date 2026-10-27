import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCookieBanner, getCookieBannerSafelist, initCookieBanner } from './index';

const KEY = 'cookie_consent';

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const banner = () => document.getElementById('cookie-banner')!;
const accept = () => banner().querySelector<HTMLButtonElement>('[data-cookie-accept]')!;
const decline = () => banner().querySelector<HTMLButtonElement>('[data-cookie-decline]')!;

describe('createCookieBanner', () => {
  it('renders custom copy and the policy link', () => {
    const html = createCookieBanner({
      text: 'Hallo',
      policyHref: '/privacy',
      policyLabel: 'Lees meer',
      acceptLabel: 'Accepteren',
      declineLabel: 'Weigeren',
    });
    expect(html).toContain('Hallo');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('Lees meer');
    expect(html).toContain('Accepteren');
    expect(html).toContain('Weigeren');
  });

  it('omits the link when policyHref is falsy', () => {
    expect(createCookieBanner({ policyHref: null })).not.toContain('<a ');
  });

  it('merges class overrides over the defaults', () => {
    const html = createCookieBanner({ classes: { accept: 'my-accept' } });
    expect(html).toContain('class="my-accept"');
    // untouched classes keep their defaults
    expect(html).toContain('text-slate-700');
  });
});

// Grab the injected <style> block (empty string if there isn't one).
const styleBlock = (html: string): string => html.match(/<style>[\s\S]*?<\/style>/)?.[0] ?? '';

describe('presets', () => {
  it('applies a named palette via Tailwind classes, no style block', () => {
    const html = createCookieBanner({ theme: 'indigo' });
    expect(html).toContain('bg-indigo-600');
    expect(html).toContain('text-indigo-600');
    expect(styleBlock(html)).toBe('');
  });

  it('maps radius and position to concrete utilities', () => {
    const html = createCookieBanner({ radius: 'md', position: 'top-center' });
    expect(html).toContain('rounded-lg'); // radius md
    expect(html).toContain('sm:-translate-x-1/2'); // centered
    expect(html).toContain('top-6');
  });

  it('applies a named font stack via class', () => {
    expect(createCookieBanner({ font: 'mono' })).toContain('font-mono');
  });
});

describe('custom theme', () => {
  it('paints accept + link from a hex accent, dropping the palette classes', () => {
    const html = createCookieBanner({ theme: { accent: '#7c3aed' }, radius: 'md' });
    const style = styleBlock(html);
    expect(style).toContain('[data-cookie-accept]{background:#7c3aed');
    expect(style).toMatch(/\[data-cookie-accept\]:hover\{background:color-mix\(in srgb, #7c3aed/);
    expect(style).toContain('[data-cookie-link]{color:#7c3aed}');
    expect(html).toContain('data-cookie-link');
    // no Tailwind accent color, but structural classes remain
    expect(html).not.toContain('bg-emerald-600');
    expect(html).toContain('flex-1');
    expect(html).toContain('rounded-lg');
  });

  it('honors explicit accentHover and accentText', () => {
    const style = styleBlock(
      createCookieBanner({ theme: { accent: '#000', accentHover: '#111', accentText: '#eee' } }),
    );
    expect(style).toContain('background:#000;color:#eee');
    expect(style).toContain(':hover{background:#111}');
  });

  it('applies a custom card surface and drops the default white background', () => {
    const html = createCookieBanner({ theme: { accent: '#22d3ee', surface: '#0f172a' } });
    expect(styleBlock(html)).toContain('#cookie-banner{background:#0f172a}');
    expect(html).not.toContain('bg-white/95');
  });

  it('keeps the default card background when no surface is given', () => {
    const html = createCookieBanner({ theme: { accent: '#22d3ee' } });
    expect(html).toContain('bg-white/95');
    expect(styleBlock(html)).not.toContain('#cookie-banner{background');
  });

  it('colors body text + decline from surfaceText', () => {
    const style = styleBlock(
      createCookieBanner({ theme: { accent: '#fff', surface: '#111', surfaceText: '#e2e8f0' } }),
    );
    expect(style).toContain('[data-cookie-text]{color:#e2e8f0}');
    expect(style).toContain('[data-cookie-decline]{color:#e2e8f0}');
  });
});

describe('custom font', () => {
  it('sets font-family via the style block, not a font class', () => {
    const html = createCookieBanner({ font: { family: "'Inter', sans-serif" } });
    expect(styleBlock(html)).toContain("#cookie-banner{font-family:'Inter', sans-serif}");
    expect(html).not.toContain('font-sans');
  });
});

describe('getCookieBannerSafelist', () => {
  const safelist = getCookieBannerSafelist();

  it('covers every named accent (accept bg + link color)', () => {
    for (const c of ['bg-emerald-600', 'bg-indigo-600', 'bg-slate-900', 'text-emerald-600', 'text-slate-700']) {
      expect(safelist).toContain(c);
    }
  });

  it('covers every radius, font, and position utility', () => {
    for (const c of ['rounded-none', 'rounded-full', 'rounded-xl', 'font-sans', 'font-serif', 'font-mono']) {
      expect(safelist).toContain(c);
    }
    for (const c of ['bottom-4', 'sm:top-6', 'sm:left-6', 'sm:-translate-x-1/2']) {
      expect(safelist).toContain(c);
    }
  });

  it('keeps variant-prefixed and structural classes', () => {
    expect(safelist).toContain('hover:bg-emerald-700');
    expect(safelist).toContain('bg-white/95');
    expect(safelist).toContain('z-[9999]');
  });

  it('is de-duplicated, sorted, and free of empty entries', () => {
    expect(new Set(safelist).size).toBe(safelist.length);
    expect([...safelist].sort()).toEqual(safelist);
    expect(safelist).not.toContain('');
    expect(safelist.every((c) => !/\s/.test(c))).toBe(true);
  });
});

describe('style-block sanitization', () => {
  it('strips tag/rule breakouts from custom values', () => {
    const html = createCookieBanner({
      theme: {
        accent: '#fff}</style><script>alert(1)</script>',
        accentHover: 'red;}body{display:none',
      },
    });
    // no executable tag, and only the one legit closing tag
    expect(html).not.toMatch(/<script/i);
    expect((html.match(/<\/style>/g) ?? []).length).toBe(1);
    // the smuggled `body{...}` rule can't form
    expect(styleBlock(html)).not.toContain('body{');
  });
});

describe('initCookieBanner', () => {
  it('mounts once and opens when no decision is stored', () => {
    initCookieBanner();
    expect(document.querySelectorAll('#cookie-banner')).toHaveLength(1);
    expect(banner().getAttribute('aria-hidden')).toBe('false');
  });

  it('stays closed when a decision already exists', () => {
    localStorage.setItem(KEY, 'accepted');
    initCookieBanner();
    expect(banner().getAttribute('aria-hidden')).toBe('true');
  });

  it('does not duplicate the element on repeated init', () => {
    initCookieBanner();
    initCookieBanner();
    expect(document.querySelectorAll('#cookie-banner')).toHaveLength(1);
  });

  it('persists + fires onAccept and closes', () => {
    const onAccept = vi.fn();
    initCookieBanner({ onAccept });
    accept().click();
    expect(localStorage.getItem(KEY)).toBe('accepted');
    expect(onAccept).toHaveBeenCalledOnce();
    expect(banner().getAttribute('aria-hidden')).toBe('true');
  });

  it('persists + fires onDecline', () => {
    const onDecline = vi.fn();
    initCookieBanner({ onDecline });
    decline().click();
    expect(localStorage.getItem(KEY)).toBe('declined');
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it('honors a custom storageKey', () => {
    initCookieBanner({ storageKey: 'cc' });
    accept().click();
    expect(localStorage.getItem('cc')).toBe('accepted');
  });

  it('reset() clears storage and re-opens', () => {
    const handle = initCookieBanner();
    accept().click();
    expect(banner().getAttribute('aria-hidden')).toBe('true');
    handle.reset();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(banner().getAttribute('aria-hidden')).toBe('false');
  });

  it('open()/close() toggle visibility', () => {
    localStorage.setItem(KEY, 'accepted');
    const handle = initCookieBanner();
    handle.open();
    expect(banner().style.pointerEvents).toBe('auto');
    handle.close();
    expect(banner().style.pointerEvents).toBe('none');
  });

  it('makes the hidden banner inert so its controls are not focusable', () => {
    expect(createCookieBanner()).toMatch(/<div id="cookie-banner"[^>]*\sinert[\s>]/);
    localStorage.setItem(KEY, 'accepted');
    const handle = initCookieBanner();
    expect(banner().hasAttribute('inert')).toBe(true);
    handle.open();
    expect(banner().hasAttribute('inert')).toBe(false);
    handle.close();
    expect(banner().hasAttribute('inert')).toBe(true);
  });
});
