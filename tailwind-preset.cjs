// Tailwind CSS (v3) preset for @mmargauxx/cookie-banner.
//
//   // tailwind.config.js
//   module.exports = {
//     presets: [require('@mmargauxx/cookie-banner/tailwind-preset')],
//     content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
//   };
//
// The banner's utility classes live inside this package's compiled JS, so your
// own `content` globs won't see them and Tailwind would purge them. This preset
// fixes that two ways at once:
//   1. `content` — points Tailwind at this package's dist so it scans the real
//      class strings (the reliable path; captures variant-prefixed classes like
//      `sm:left-6` and `hover:bg-emerald-700`).
//   2. `safelist` — an explicit, always-in-sync list of every class the banner
//      can emit, as a belt-and-suspenders fallback.
//
// Tailwind v4 users: skip this file and add to your CSS instead:
//   @source "../node_modules/@mmargauxx/cookie-banner/dist/**/*.js";
const path = require('path');
const { getCookieBannerSafelist } = require('./dist/index.cjs');

// Absolute, layout-independent glob (works under pnpm / hoisting / monorepos).
const distGlob = path.join(__dirname, 'dist', '**', '*.js').split(path.sep).join('/');

module.exports = {
  content: [distGlob],
  safelist: getCookieBannerSafelist(),
};
