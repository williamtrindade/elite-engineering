# Agent guide

How to work on this repository. What the project does and how it's built is in [readme.md](readme.md); read it first.

## Commands

- `npm test`: all tests, no network. Run it after every change; it must stay green.
- `npm run dev`: API on http://localhost:8787 and site on http://localhost:8788. Open the site through it, never `web/index.html` from disk.
- To call the API by hand, send `Origin: http://localhost:8788`, or it answers `403`.

## Rules

- **Don't commit, branch or push.** The owner commits. Leave the changes in the working tree and say what changed.
- **Don't deploy.** Pushing to `main` deploys both Cloudflare projects; say when a change needs the Worker, the Pages site, or both.
- **Hexagonal architecture, kept lean.** The core (`api/src/app.js`, `web/src/core/`) never imports adapters, UI or platforms; `test/architecture.test.js` fails otherwise. New implementations go in adapters, and only the composition roots (`web/src/main.js`, `api/platforms/*`) pick them. Don't add layers beyond ports and adapters.
- **Cloudflare is a plugin.** Cloudflare-specific code lives only in `api/platforms/cloudflare/`; the rest must work without it.
- **No build step.** Plain ES modules in the browser and on Node 22+. Don't add bundlers, TypeScript or frameworks; ports are JSDoc `@typedef`s.
- **Config:** API settings are environment variables, validated in `api/src/config.js` and listed in `.env.example` and `wrangler.jsonc` `vars` (keep the three in sync). Secrets go in `.env` or `wrangler secret`, never in the repository. `web/` is public: no secrets there.
- **Feeds:** a feed must be listed in `web/data/companies.js`, which is also the API's allowlist. Adding a company also means a logo in `web/static/` (256×256 `.webp`) and its name in the `#about` footer of `web/index.html` (`test/web/seo.test.js` checks it). Check the feed first: it must be engineering content (not product news), recent, and parse in the browser. More feeds means more API requests per uncached page load, so keep `RATE_LIMIT_REQUESTS` well above the feed count.

## Tests

- Write the failing test first, then the fix. Tests use `node:test` and never hit the network: fake the ports (`test/api/helpers.js` has `mockFetch`, `hangingFetch` and others).
- A new implementation of a port must pass that port's contract suite in `test/api/contracts/`.

## Things that are easy to break

- **Nothing may wait forever for a blog.** The API gives up on a blog after 8 s, the browser on the API after 10 s, and the page shows what it has after 3 s (except for shared `?reel=` links, which wait for every feed). The browser timeout must stay above the API's. See "Change the waiting times" in the readme.
- **The page doesn't reorder after it shows.** Feeds that miss the 3 s wait are left out of that visit and show up on the next one from the cache; don't render them as they arrive.
- **Both themes.** The markup uses the dark theme's Tailwind colors; the light theme remaps them in one block at the end of `web/style.css`. A new color class needs its light version there, and a company with a white logo needs `whiteLogo: true`. Check UI changes in both themes.
- **Cache keys:** bump `CACHE_PREFIX` in `web/src/adapters/CachedFeedGateway.js` when the cached shape changes.

## Style

- Code, comments and docs in English.
- Match the surrounding code: 4-space indent, single quotes, small classes, a short comment on *why* when it isn't obvious.
- When behavior changes, update `readme.md` in the same change.
- Design notes for larger changes go in `docs/superpowers/specs/`.
