/**
 * Build the distributable plugin zip (§8 Phase 3 deliverable):
 *   npm run plugin:zip  →  dist/veazen.zip
 * Ships only runtime files — no vendor/, tests/, configs or build tooling.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const stage = join(dist, 'veazen');

rmSync(dist, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

const SHIP = ['veazen.php', 'uninstall.php', 'readme.txt', 'includes', 'assets', 'languages'];
for (const entry of SHIP) {
  execFileSync('cp', ['-r', join(root, entry), stage]);
}

execFileSync('zip', ['-qr', join(dist, 'veazen.zip'), 'veazen'], { cwd: dist });
rmSync(stage, { recursive: true, force: true });
console.log('built dist/veazen.zip');
