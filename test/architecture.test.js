// The hexagonal boundary, checked on every `npm test`: the core never depends on
// adapters, UI or platforms. Only the composition roots (web/src/main.js,
// api/platforms/*) wire implementations into it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function files(dir) {
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : path.endsWith('.js') ? [path] : [];
    });
}

// Static and dynamic imports, including JSDoc import('...') types, resolved to repo paths
function imports(file) {
    return [...readFileSync(file, 'utf-8').matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)]
        .map(([, specifier]) => specifier.startsWith('.')
            ? relative(root, resolve(dirname(file), specifier))
            : `package:${specifier}`);
}

function violations(sources, allowed) {
    return sources.flatMap(file => imports(file)
        .filter(target => !allowed.some(prefix => target.startsWith(prefix)))
        .map(target => `${relative(root, file)} → ${target}`));
}

test('API core (api/src) imports only itself and the app data, no packages', () => {
    assert.deepEqual(violations(files(join(root, 'api/src')), ['api/src/', 'web/data/']), []);
});

test('front core (web/src/core) imports only itself and the ports', () => {
    assert.deepEqual(violations(files(join(root, 'web/src/core')), ['web/src/core/', 'web/src/ports.js']), []);
});

test('front adapters and UI do not import each other', () => {
    const allowed = ['web/src/core/', 'web/src/ports.js'];

    assert.deepEqual([
        ...violations(files(join(root, 'web/src/adapters')), [...allowed, 'web/src/adapters/']),
        ...violations(files(join(root, 'web/src/ui')), [...allowed, 'web/src/ui/'])
    ], []);
});

test('nothing outside api/platforms/cloudflare mentions wrangler or Cloudflare bindings', () => {
    const offenders = [...files(join(root, 'api/src')), join(root, 'api/platforms/node.js'), ...files(join(root, 'web/src'))]
        .filter(file => /wrangler|FEED_LIMITER|CF-Connecting-IP|cacheTtl/.test(readFileSync(file, 'utf-8')))
        .map(file => relative(root, file));

    assert.deepEqual(offenders, []);
});
