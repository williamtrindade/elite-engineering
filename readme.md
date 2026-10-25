![img.png](img.png)
> Curating the best engineering articles from industry-leading tech blogs.

**Elite Engineering** is an aggregator of news and articles covering software engineering, system architecture, and infrastructure. It consumes-in real time-the official RSS/Atom feeds from the world's leading technology companies (such as Meta, Apple, Cloudflare, Dropbox, and GitHub), centralizing high-level technical knowledge within a single, modern, and responsive interface.

## How it works

![generalArchitecture.svg](docs/diag/generalArchitecture.svg)

- **`web/`** is the front end: plain HTML, CSS and ES modules, no build step. It parses RSS 2.0 and Atom in the browser (`src/services/FeedProxyProvider.js`) and caches the articles in `localStorage` for 12 hours.
- **`api/`** is a Worker that fetches the feeds on the browser's behalf, since blogs don't allow cross-origin requests. It only proxies the feeds listed in `web/data/companies.js`, caches them at the edge for 30 minutes, rejects requests from other origins, and logs every request with [pino](https://getpino.io).
- **`web/config.js`** picks the API URL: `http://localhost:8787` when running locally, `https://elite-engineering-api.williamtrindade-dev.workers.dev` otherwise.

## Article images

Images are handled in two separate steps: finding the image's URL, then downloading the file.

**1. Finding the URL: inside the feed XML, when the feed is parsed.** No extra request is made: the URL comes in the same XML the API already returns. `image()` in `src/services/FeedProxyProvider.js` looks, in this order, for:

| # | Where in the item | Example feeds |
|---|---|---|
| 1 | `<media:content medium="image" url="…">` | Google Research, Dropbox |
| 2 | `<media:thumbnail url="…">` | Google Research, Dropbox |
| 3 | `<enclosure type="image/…" url="…">` (or an Atom `<link rel="enclosure">`) | Cloudflare |
| 4 | first `<img src="…">` in the post HTML (`content:encoded`/`description`, or Atom `content`/`summary`) | Meta, Netflix, AWS, NVIDIA, Slack… |

Step 4 skips `data:` placeholders and images declared smaller than 50px (icons, Medium's 1×1 tracking pixel). The URL is then resolved against the article link (relative paths), upgraded from `http` to `https`, and dropped if it uses any other scheme. If nothing is found, `image` is `''`. Some feeds (OpenAI, Hugging Face, Spotify, Apple ML, Google Developers) have no images at all.

The URL is stored with the rest of the article, so it is cached in `localStorage` for 12 hours like everything else.

**2. Downloading the file: by the browser, straight from the blog's server, when the card is about to be seen.** The API is not involved. `src/UI/ArticleMedia.js` creates the `<img>`:

- in the grid with `loading="lazy"`: the browser only downloads images of cards near the viewport;
- in Reels right away, plus the next card's image in the background (`preloadImage`) so a swipe shows it immediately.

Downloaded files go to the browser's normal HTTP cache, for as long as each blog's `Cache-Control` allows (from 0 for Cloudflare up to a year for Meta). They are not stored in `localStorage`: a few images would exceed its ~5 MB limit.

While an image loads, or when there is none, or it fails (404, hotlink blocking, an image under 120px wide), the card shows the company logo on its brand color.

![articleImagesArchitecture.svg](docs/diag/articleImagesArchitecture.svg)

---

## Sharing an article

The **Share** and **Copy** buttons in Reels send a link to our site, not to the blog, so whoever opens it sees the article in our Reels. Nothing is stored: the article's URL travels inside the link.

1. **Share:** the article URL is encoded into the `reel` query param (`buildReelUrl()` in `src/helpers/ShareLink.js`):
   `https://<our-site>/?reel=https%3A%2F%2Fnetflixtechblog.com%2Fbeyond-api-compatibility-...`
2. **Open:** after the feeds load, `openSharedReel()` in `script.js` decodes the param (`parseReelParam()`) back into the article URL.
3. **Find:** it looks for the article with that exact `link` in `state.allArticles`.
4. **Show:** if found, Reels opens on it (browsing all articles if the active filter would hide it). If not (the post left the RSS feed, or the blog changed its URL), the param is dropped and the home page stays open.

While browsing Reels, the address bar is kept on the current article's link, so it can be copied from there too; closing Reels removes the param.

![sharingArchitecture.svg](docs/diag/sharingArchitecture.svg)

--- 

## Project structure

```
web/                 front end (Cloudflare Pages)
  data/companies.js  companies and feed URLs (also the API's allowlist)
  config.js          API base URL
  src/helpers/ShareLink.js  builds and reads shared Reels links (?reel=)
api/                 feed proxy (Cloudflare Worker)
  src/index.js       request handler, allowlist, CORS
  wrangler.jsonc     Worker config
test/                parser and API tests
```

---

## Running locally

Requires Node.js 22+.

```bash
npm install
npm --prefix api install
npm run dev
```

Open **http://localhost:8788**. `npm run dev` starts both servers:

| Script | What it runs | URL |
|---|---|---|
| `npm run dev:api` | `wrangler dev` (Worker runtime) | http://localhost:8787 |
| `npm run dev:web` | `serve` (static files) | http://localhost:8788 |

Opening `web/index.html` directly from disk does not work: browsers block ES modules on `file://`.

To fetch the feeds again instead of reading the 12-hour cache, clear the site's `localStorage` (DevTools → Application → Clear site data).

The API only answers requests from the site's origins (production, preview deployments and localhost), and returns `403` otherwise. To call it with curl, send the header:

```bash
curl -H "Origin: http://localhost:8788" "http://localhost:8787/api/feed?url=https%3A%2F%2Fblog.cloudflare.com%2Frss%2F"
```

This keeps other websites from using the API through their visitors' browsers. It is not authentication: a script can fake the `Origin` header.

Each IP is also limited to 60 requests per minute (`ratelimits` in `api/wrangler.jsonc`); above that the API returns `429` with `Retry-After: 60`. A full page load without cache makes 21 requests, one per feed.

--- 

## Tests

```bash
npm test
```

Runs the feed parser tests against real RSS/Atom fixtures (`test/fixtures/`) and the Worker handler tests (allowlist, CORS, error responses), with no network access.

## Adding a company or feed

Add it to `web/data/companies.js` and its logo to `web/static/`. The API allowlist is built from the same file, so no API change is needed. Both projects must be deployed for the new feed to load.

For feeds that mix engineering posts with everything else, a feed can keep only some categories and cap the number of items:

```js
new Feed({ url: 'https://openai.com/news/rss.xml', categories: ['Engineering', 'Research', 'Security'], limit: 30 })
```

Categories match case-insensitively; items without a matching category are dropped.

--- 

## Deployment

Front end and API are two Cloudflare projects connected to this repository, each deployed on push:

| | Pages (`web`) | Worker (`api`) |
|---|---|---|
| Root directory | `web` | `api` |
| Build command | *(empty)* | *(empty, or `npm ci` if dependencies aren't installed)* |
| Deploy command | — | `npx wrangler deploy` |
| Output directory | `.` | — |

Worker logs are in **Workers & Pages → elite-engineering-api → Logs** (Workers Logs is enabled in `wrangler.jsonc`).
