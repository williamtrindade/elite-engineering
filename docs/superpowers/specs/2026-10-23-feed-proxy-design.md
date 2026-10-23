# Proxy de feeds próprio (Cloudflare Pages Function)

Data: 2026-10-23

## Contexto

O app busca os feeds RSS/Atom através do `api.rss2json.com`. Desde outubro/2026 o
serviço responde **403** com um desafio da Cloudflare (`cf-mitigated: challenge`)
para qualquer `fetch()`, então nenhum feed carrega. Os feeds de origem continuam
no ar (14 de 15 respondem 200; `rsshub.app/uber/blog` responde 403 e está fora
do escopo).

O site é hospedado no **Cloudflare Pages**.

## Objetivo e critério de sucesso

Eliminar a dependência do rss2json com um proxy próprio. Sucesso: os 14 feeds
que estão no ar voltam a carregar no app, com título, link, data, categorias e
resumo, sem mudanças em `FeedService`, models ou UI.

## Decisões

- Proxy como **Pages Function** no mesmo repositório (mesma origem: sem CORS,
  deploy junto com o site, sem `wrangler`/build no app).
- A Function devolve o **XML bruto**; o parse acontece no navegador com
  `DOMParser` (o runtime de Workers não tem `DOMParser`, e parsear lá exigiria
  uma dependência).
- Allowlist derivada de `data/companies.js`, para não virar proxy aberto.

## Componente 1: `functions/api/feed.js`

Rota: `GET /api/feed?url=<url do feed>`

1. Lê o parâmetro `url`. Ausente ou fora da allowlist → **400** `{ error }`.
2. `fetch(url)` com `User-Agent` de navegador e
   `cf: { cacheTtl: 1800, cacheEverything: true }` (cache na borda por 30 min).
3. Origem não-ok → **502** `{ error, status }`. Falha de rede → **502** `{ error }`.
4. Sucesso → corpo XML com `Content-Type: application/xml; charset=utf-8` e
   `Cache-Control: public, max-age=1800`.

Allowlist: `new Set(companiesList.flatMap(c => c.feeds.map(f => f.url)))`,
importando `../../data/companies.js` (o Pages empacota Functions com esbuild).

Fora do escopo: autenticação, rate limiting próprio, transformar o XML.

## Componente 2: `src/services/FeedProxyProvider.js`

Substitui `Rss2JsonProvider` com a mesma interface `fetch(url)` →
`{ status: 'ok', feed: { title, link, description, image }, items }`, onde cada
item é `{ title, link, pubDate, categories (máx. 2), excerpt (320 chars) }`.

- Cache em localStorage via `Cache`, prefixo novo `articles_v3_`; o construtor
  remove entradas `articles_*` com outro prefixo (inclui as do rss2json).
- Busca `/api/feed?url=<encodeURIComponent(url)>`; resposta não-ok → erro.
- Parse em função pura exportada `parseFeed(xmlText)`, que usa o `DOMParser`
  global (o mesmo que `Helper.stripHtml` já usa). Nos testes, o `DOMParser` do
  `linkedom` é instalado em `globalThis`:
  - **RSS 2.0** (`channel > item`): `title`, `link`, `pubDate`, `category`,
    resumo de `description`, senão `content:encoded`. Feed: `channel > title`,
    `link`, `description`, `image > url`.
  - **Atom** (`feed > entry`): `title`, `link[rel=alternate]` ou primeiro `link`
    com `href`, `published` senão `updated`, `category[term]`, resumo de
    `summary` senão `content`. Feed: `feed > title`, `link[rel=alternate]`,
    `subtitle`, `logo`/`icon`.
  - `parsererror` ou raiz não reconhecida → lança erro.
- Resumo: mesma lógica atual (`Helper.stripHtml`, remove `[…]`/`[...]` final,
  `Helper.truncate(…, 320)`).

Erros sobem como exceção; `FeedService` já trata (feed fica vazio).

## Outras mudanças

- `script.js`: troca import/instância do provider.
- Remove `src/services/Rss2JsonProvider.js`.
- `package.json` com apenas `devDependencies: { linkedom }` e script
  `"test": "node --test"`; `node_modules` no `.gitignore`. O app não carrega
  nada disso.

## Testes

1. `node --test`: `parseFeed` com fixtures reais de RSS 2.0 e Atom (campos,
   limite de categorias, fallback de resumo/data), XML inválido e raiz
   desconhecida lançam erro.
2. Manual: `npx wrangler pages dev .`, chamar `/api/feed` para os 15 feeds
   (14 → 200, Uber → 502), URL fora da allowlist → 400, e abrir o app no
   navegador para conferir os artigos.
