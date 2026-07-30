import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('uses the portal session cookie as Bearer authorization for proxied API calls', async () => {
  const routeSource = await readFile(new URL('./route.ts', import.meta.url), 'utf8');

  assert.match(
    routeSource,
    /request\.cookies\.get\(COOKIE_NAME\)\?\.value/,
    'the proxy must retrieve the authenticated portal session from its HTTP-only cookie',
  );
  assert.match(
    routeSource,
    /`Bearer \$\{sessionToken\}`/,
    'the proxy must pass the portal session as the API Bearer token',
  );
});
