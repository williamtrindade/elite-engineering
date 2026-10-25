# Arquitetura hexagonal na API e no front, sem depender de Cloudflare/wrangler

Data: 2026-10-25

## Contexto

A API era um único `api/src/index.js` que misturava as regras do proxy (Origin,
allowlist, proxy do feed) com detalhes do Cloudflare: `env.FEED_LIMITER`,
`CF-Connecting-IP`, `fetch(url, { cf: { cacheTtl } })`, regex de `pages.dev` no
código e `wrangler dev` como único jeito de rodar. No front, o provider de feeds
fazia cache + HTTP + parse, e o `StateSingleton` concentrava estado de tela e
regra de filtro.

Próximos passos do produto: salvar posts para ler depois, marcar como lido, e
depois login e banco. Antes disso, o código deve depender de **interfaces**, não
de D1/Worker/wrangler.

Uma primeira versão em Clean Architecture completa (domain / application /
interface / infrastructure) foi implementada e descartada no mesmo dia: 21
arquivos na API para o que eram 117 linhas, complexo demais para o tamanho do
projeto. Esta spec é a versão hexagonal (ports and adapters), que mantém os
mesmos objetivos com só a fronteira núcleo × adapters.

## Objetivo e critérios de sucesso

1. **Núcleo × adapters refletido nas pastas**, com a fronteira (o núcleo nunca
   importa adapters, UI ou plataformas) verificada por teste.
2. **Cloudflare é um plugin**: tudo que é Cloudflare/wrangler mora em
   `api/platforms/cloudflare/`, com `package.json` próprio. Apagando essa pasta,
   `npm install`, `npm run dev` e `npm test` continuam funcionando.
3. **Plugável**: trocar uma implementação = mudar uma linha numa plataforma;
   nova plataforma = novo arquivo/pasta em `api/platforms/`.
4. **Configuração em `.env`**: toda chave de ambiente vem de variáveis, validadas
   num único lugar (`api/src/config.js`), falhando na subida se faltar algo.
5. **Comportamento inalterado**: mesmos status, headers, corpos e logs da API;
   mesma UI no front. Todos os testes existentes continuam passando.

## Decisões

- **Ports em JSDoc** (`@typedef`), sem TypeScript e sem build. Ports com mais de
  uma implementação têm uma **suíte de contrato** rodada contra cada uma.
- **Wrangler só no deploy** (Workers Builds) e no script opcional
  `npm --prefix api/platforms/cloudflare run dev`. `npm run dev` usa Node puro.
- **Núcleo sem dependências npm.** O `pino` é criado pelas plataformas. Não existe
  `api/package.json`: o `pino` do Node vem do `package.json` da raiz, e o do
  Worker do `package.json` de `platforms/cloudflare/` (o Workers Builds só
  instala ali).
- **Allowlist de feeds continua em `web/data/companies.js`**: é dado do produto,
  não configuração de ambiente.
- **O front não lê `.env`**: é estático e público. A única config dele é a URL da
  API em `web/config.js`, importada só pelo `main.js`.

## API

```
api/
  src/
    app.js        núcleo: Origin (com curingas), CORS, rotas, rate limit, allowlist, proxy
                  createApi({ config, rateLimiter, feedGateway, logger, clientIp }) → (Request) → Response
    ports.js      RateLimiter, FeedGateway, Logger, ClientIp (JSDoc)
    adapters.js   FetchFeedGateway, CachedFeedGateway, MemoryCache, MemoryRateLimiter
    config.js     parseConfig(env)
  platforms/
    node.js       node:http ↔ Request/Response, IP do socket, adaptadores em memória; escuta PORT
    cloudflare/
      package.json   ÚNICO lugar com wrangler (+ pino para o bundle)
      wrangler.jsonc main ./worker.js, binding FEED_LIMITER, vars
      worker.js      export default { fetch }, CfRateLimiter, CF-Connecting-IP
      test/          testes da plataforma (somem junto com a pasta)
```

### Ports

```js
RateLimiter  { limit(key: string): Promise<boolean> }              // true = permitido
FeedGateway  { fetch(url: string): Promise<{ ok, status, body }> } // rejeita se inalcançável
Logger       { info(obj, msg), warn(obj, msg), error(obj, msg) }    // pino cumpre
ClientIp     (request: Request) => string
```

`Cache { get(key), set(key, value, ttlSeconds) }` é interno a `adapters.js`
(usado só pelo `CachedFeedGateway`).

### Plataformas

| | Node (`npm run dev`) | Cloudflare (deploy) |
|---|---|---|
| Config | `.env` via `node --env-file-if-exists=.env` | `vars` do `wrangler.jsonc` / painel |
| RateLimiter | `MemoryRateLimiter(RATE_LIMIT_*)` | `CfRateLimiter(env.FEED_LIMITER)` |
| FeedGateway | `CachedFeedGateway(FetchFeedGateway, MemoryCache)` | `FetchFeedGateway({ init: { cf: { cacheTtl, cacheEverything } } })` |
| IP | `socket.remoteAddress` (WeakMap por Request, não falsificável por header) | `CF-Connecting-IP` |
| Logger | `pino` (JSON no stdout) | `pino` browser build (`asObject`), indexado pelo Workers Logs |

O binding de rate limit do Cloudflare precisa dos números literais no
`wrangler.jsonc`; um teste garante que `RATE_LIMIT_REQUESTS` e
`RATE_LIMIT_PERIOD_SECONDS` das `vars` batem com `ratelimits[0].simple`.

### Configuração

```bash
PORT=8787                                  # só Node; padrão 8787
ALLOWED_ORIGINS=https://elite-engineering.pages.dev,https://*.elite-engineering.pages.dev,http://localhost:*,http://127.0.0.1:*
FEED_CACHE_SECONDS=1800
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_PERIOD_SECONDS=60
LOG_LEVEL=info                             # padrão info
```

Curingas de `ALLOWED_ORIGINS`: `*.` no início do host casa exatamente um rótulo
de subdomínio (não casa o domínio puro nem `x.dominio.evil.com`); `:*` casa
qualquer porta ou nenhuma. Sem regex no `.env`.

`.env` e `.dev.vars` no `.gitignore`; `.env.example` versionado.

## Front

```
web/
  config.js          URL da API (só main.js importa)
  data/companies.js  empresas e feeds (também a allowlist da API)
  src/
    core/            Article, Company, Feed, filterArticles, LoadArticles
    ports.js         FeedGateway, KeyValueStore
    adapters/        ApiFeedGateway, CachedFeedGateway, LocalStorageStore, feedParser, html
    ui/              UI, ReelsUI, ArticleMedia, Theme, ShareLink, AppController, state, format
    main.js          composition root (antes script.js)
```

`core/` só importa `core/` e `ports.js`; `adapters/` e `ui/` usam o núcleo mas
não se importam entre si. `LoadArticles` devolve a lista de artigos em vez de
mutar os objetos `Feed` (nada lia título/descrição do feed).

## Testes

- `test/api/app.test.js`: os casos do antigo `test/api.test.js` + curingas de origem.
- `test/api/config.test.js`: validação do `.env`, `.env.example` completo.
- `test/api/adapters.test.js` + `test/api/contracts/`: suítes de contrato de
  `RateLimiter` e `FeedGateway` contra cada adapter; `platforms/cloudflare/test/`
  roda a de `RateLimiter` contra `CfRateLimiter`.
- `test/api/node.test.js`: servidor Node real em porta efêmera.
- `api/platforms/cloudflare/test/worker.test.js`: montagem a partir do `env`,
  `CF-Connecting-IP`, opção `cf` no fetch, `vars` × `ratelimits`, `vars` × `.env.example`.
- `test/web/`: parser, busca, share link, `LoadArticles`, `CachedFeedGateway`.
- `test/architecture.test.js`: fronteira núcleo × adapters, e nenhum termo do
  Cloudflare fora da pasta dele.

## Deploy

- Pages: sem mudança (root `web`).
- Worker: no Workers Builds, **root directory** passa de `api` para
  `api/platforms/cloudflare`; deploy command `npx wrangler deploy`.

## Fora do escopo

- Salvos / lidos (próxima spec, com um port `SavedRepository`: adapter
  `localStorage` primeiro, D1 ou outro banco depois).
- Botão "Try Again" (`onclick="initApp()"` não alcança uma função de módulo),
  registrado no readme como pendência conhecida.

## Verificação (2026-10-25)

- `npm test`: 79 testes passando (eram 29); 70 numa cópia sem `api/platforms/cloudflare/`.
- Violações propositais (`web/src/core` importando adapter, `app.js` importando
  plataforma) derrubam o teste de arquitetura.
- Node: `npm run dev` serve o feed real (200, 330 KB).
- Cloudflare: `wrangler deploy --dry-run` empacota (32 KiB) com binding e vars.
- Front no navegador: 283 artigos de 16 empresas, filtros e Reels funcionando.
  O feed da Uber (rsshub.app) responde 403 direto na origem, sem relação com esta mudança.
