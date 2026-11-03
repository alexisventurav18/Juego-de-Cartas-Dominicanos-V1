import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'src/games');
const TARGET_DIR = join(ROOT, 'supabase/functions/_shared/games');

const RELATIVE_IMPORT = /from\s+'(\.\/[^']+)'/g;

/** Deno exige la extensión .ts en los imports relativos. */
function withTsExtensions(source: string): string {
  return source.replace(RELATIVE_IMPORT, (_, path: string) => `from '${path.endsWith('.ts') ? path : `${path}.ts`}'`);
}

export function sharedFiles(): { name: string; content: string }[] {
  return readdirSync(SOURCE_DIR)
    .filter((name) => name.endsWith('.ts'))
    .sort()
    .map((name) => ({ name, content: withTsExtensions(readFileSync(join(SOURCE_DIR, name), 'utf8')) }));
}

function main(): void {
  mkdirSync(TARGET_DIR, { recursive: true });
  const files = sharedFiles();
  for (const { name, content } of files) writeFileSync(join(TARGET_DIR, name), content);
  console.log(`Copiados ${files.length} archivos a supabase/functions/_shared/games.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
