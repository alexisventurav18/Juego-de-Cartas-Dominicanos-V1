import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { sharedFiles } from '../scripts/syncFunctions';

describe('copia del juego para la Edge Function', () => {
  it('está al día con src/games (ejecuta `npm run sync:functions` si falla)', () => {
    for (const { name, content } of sharedFiles()) {
      const onDisk = readFileSync(`supabase/functions/_shared/games/${name}`, 'utf8');
      assert.equal(onDisk, content, `${name} está desactualizado`);
    }
  });
  it('todos los imports relativos llevan extensión .ts (requisito de Deno)', () => {
    for (const { name, content } of sharedFiles()) {
      for (const m of content.matchAll(/from\s+'(\.\/[^']+)'/g)) assert.ok(m[1].endsWith('.ts'), `${name}: ${m[1]}`);
    }
  });
});
