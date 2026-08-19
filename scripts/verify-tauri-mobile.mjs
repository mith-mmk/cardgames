import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
if (config.bundle?.active !== true || config.bundle?.targets !== 'all') {
  throw new Error('Tauri desktop bundling must remain enabled for all targets.');
}

// Keep mobile support visible in CI without generating platform projects here.
// `tauri android init` and `tauri ios init` create large, host-specific trees and
// must be run by a release engineer on the corresponding SDK host.
const cli = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'node_modules',
  '@tauri-apps',
  'cli',
  'tauri.js',
);
const platforms = process.platform === 'darwin' ? ['android', 'ios'] : ['android'];
for (const platform of platforms) {
  const output = execFileSync(process.execPath, [cli, platform, '--help'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!output.toLowerCase().includes(`${platform} `)) {
    throw new Error(`Tauri CLI does not expose the ${platform} workflow.`);
  }
}

if (process.platform !== 'darwin') {
  console.log('iOS workflow check skipped: Tauri iOS tooling is only available on macOS.');
}
console.log(`Tauri desktop bundling and ${platforms.join('/')} CLI workflows are available.`);
