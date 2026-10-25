import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createNodeServer, nodeClientIp } from '../../api/platforms/node.js';

// A real server on a random port, with a handler that echoes what it received
let seen;
const server = createNodeServer(async request => {
    seen = { method: request.method, url: request.url, origin: request.headers.get('Origin'), ip: nodeClientIp(request) };
    if (request.url.endsWith('/boom')) throw new Error('boom');
    if (request.method === 'POST') return new Response(await request.text(), { status: 201 });
    return new Response('<rss/>', { headers: { 'Content-Type': 'application/xml', 'X-Test': 'yes' } });
}, { logger: { error() {} } });

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

test('Node platform turns node:http requests into web Requests and back', async () => {
    const res = await fetch(`${base}/api/feed?url=x`, { headers: { Origin: 'http://localhost:8788' } });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-Test'), 'yes');
    assert.equal(await res.text(), '<rss/>');
    assert.equal(seen.method, 'GET');
    assert.match(seen.url, /\/api\/feed\?url=x$/);
    assert.equal(seen.origin, 'http://localhost:8788');
});

test('Node platform takes the client IP from the socket, not from headers', async () => {
    await fetch(`${base}/`, { headers: { 'X-Forwarded-For': '6.6.6.6' } });

    assert.equal(seen.ip, '127.0.0.1');
});

test('Node platform passes request bodies through', async () => {
    const res = await fetch(`${base}/`, { method: 'POST', body: 'hello' });

    assert.equal(res.status, 201);
    assert.equal(await res.text(), 'hello');
});

test('Node platform answers 500 when the handler throws', async () => {
    const res = await fetch(`${base}/boom`);

    assert.equal(res.status, 500);
});
