import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Cordis remains a host-provided optional peer, never a private production dependency', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.dependencies?.['@deepseek-ai/cordis'], undefined);
  assert.equal(pkg.optionalDependencies?.['@deepseek-ai/cordis'], undefined);
  assert.ok(pkg.peerDependencies?.['@deepseek-ai/cordis']);
  assert.equal(pkg.peerDependenciesMeta?.['@deepseek-ai/cordis']?.optional, true);
  assert.ok(pkg.devDependencies?.['@deepseek-ai/cordis']);
});
