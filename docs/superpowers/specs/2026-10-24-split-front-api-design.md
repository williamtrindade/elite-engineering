# Separar front (Pages) e API (Worker) no mesmo repositório

Data: 2026-10-24

## Contexto

Hoje o site (`public/`) e o proxy de feeds (`functions/api/feed.js`, Pages
Function) são um único projeto Cloudflare Pages: mesmo deploy e mesmo domínio
(`elite-engineering.pages.dev`), com o front chamando `/api/feed` relativo.
Ver `2026-10-23-feed-proxy-design.md`.

## Objetivo e critério de sucesso

Front e API no mesmo repositório, com deploys independentes:

- `web/` → projeto Pages existente, estático puro (sem Functions, sem build).
- `api/` → Worker novo (`elite-engineering-api`), deploy via Workers Builds (Git).

Sucesso: os 12 feeds que carregam hoje continuam carregando, agora vindos do
Worker; comportamento da API (allowlist, cache, status, logs) inalterado.

## Decisões

- Sem domínio próprio: front em `*.pages.dev`, API em `*.workers.dev` → CORS.
- URL da API por hostname em `web/config.js` (sem build no front).
- Deploy do Worker pelo Git (Workers Builds), root `api/`.
- Front local servido por `npx serve` (nada de Cloudflare no front).
- Allowlist continua derivada de `web/data/companies.js`, importada pelo Worker.

## Estrutura

```
web/                 ← conteúdo atual de public/ + config.js
api/
  src/index.js       ← fetch handler (lógica atual de feed.js)
  src/logger.js      ← pino (atual functions/_lib/logger.js)
  wrangler.jsonc     ← name: elite-engineering-api, main: src/index.js
  package.json       ← dependencies: pino; devDependencies: wrangler
test/                ← testes do parser e da API
package.json         ← raiz: scripts dev/test; devDependencies: linkedom, concurrently
```

Removidos: `public/` (renomeado para `web/`), `functions/`, a dependência `pino`
do `package.json` da raiz.

## Componente 1: `api/src/index.js`

`export default { fetch(request) }`:

1. `OPTIONS` (qualquer caminho) → **204** com headers CORS.
2. Caminho ≠ `/api/feed` ou método ≠ `GET` → **404** `{ error: 'Not found' }`.
3. `GET /api/feed?url=` → `handleFeed`, idêntico ao `onRequestGet` atual:
   allowlist (400), `fetch` com `User-Agent` e `cf: { cacheTtl: 1800,
   cacheEverything: true }`, falha de rede ou origem não-ok (502, com
   `upstreamStatus`), sucesso (XML, `Cache-Control: public, max-age=1800`),
   um log pino por requisição com `{ url, status, durationMs }`.

`handleFeed` e `corsHeaders` são exportados para teste.

### CORS — `corsHeaders(origin)`

Origens permitidas:

- `https://elite-engineering.pages.dev`
- `https://<sub>.elite-engineering.pages.dev` (previews)
- `http://localhost:<porta>` e `http://127.0.0.1:<porta>`

Origem permitida → `Access-Control-Allow-Origin: <origin>`,
`Access-Control-Allow-Methods: GET, OPTIONS`, `Vary: Origin`.
Origem ausente ou não permitida → só `Vary: Origin`.
Os headers vão em **todas** as respostas (204, 200, 400, 404, 502).

CORS não substitui a allowlist (clientes fora do navegador ignoram CORS).

## Componente 2: front

- `web/config.js`: `API_BASE` = `http://localhost:8787` quando `location.hostname`
  é `localhost` ou `127.0.0.1`; caso contrário
  `https://elite-engineering-api.<SUBDOMINIO>.workers.dev`. O subdomínio da
  conta é preenchido após o primeiro deploy do Worker.
- `FeedProxyProvider.fetch`: `fetch(\`${API_BASE}/api/feed?url=…\`)`. Parser e
  cache inalterados.

## Desenvolvimento local

`npm run dev` (raiz) usa `concurrently`:

- `dev:api` → `cd api && npx wrangler dev` → `http://localhost:8787`
- `dev:web` → `npx --yes serve web -l 8788` → `http://localhost:8788` (abrir esta)

`npm install` na raiz e em `api/`.

## Configuração no Cloudflare e ordem de deploy

| | Pages (existente) | Worker (novo) |
|---|---|---|
| Root directory | `web` | `api` |
| Build command | vazio | — |
| Deploy command | — | `npx wrangler deploy` (padrão) |
| Output directory | `.` | — |

Ordem, para o site não ficar sem feeds:

1. Criar o Worker no painel conectado ao repositório (root `api`).
2. Push; confirmar o Worker no ar e anotar a URL `*.workers.dev`.
3. Preencher o subdomínio em `web/config.js` e dar push.
4. Trocar o Root directory do Pages para `web`, output `.`, build vazio, e
   refazer o deploy.

## Testes

1. `test/feedParser.test.js`: import passa a apontar para `web/`.
2. `test/api.test.js` (Node, `fetch` global substituído por mock):
   allowlist → 400 com CORS; origem `pages.dev` → ACAO presente; origem de
   preview → ACAO presente; origem desconhecida → sem ACAO; origem 403 → 502
   com `upstreamStatus`; `OPTIONS` → 204; rota desconhecida → 404.
3. Manual: `npm run dev`, abrir `localhost:8788`, conferir 12 feeds carregando
   de `:8787` e headers CORS no DevTools.

## Fora do escopo

Domínio próprio, rotas de Worker, rate limiting, persistência de logs ou de
artigos.
