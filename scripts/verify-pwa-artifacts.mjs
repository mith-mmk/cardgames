import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const projectEnv = { ...process.env, TAURI_ENV_PLATFORM: '' };
const tauriEnv = { ...process.env, TAURI_ENV_PLATFORM: 'windows' };

function build(env, label) {
  const result = spawnSync(npm, ['run', 'build'], { env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`${label} build failed${result.error ? `: ${result.error.message}` : ''}`);
}

function hasWorkbox() {
  return readdirSync('dist').some((name) => name.startsWith('workbox-') && name.endsWith('.js'));
}

build(projectEnv, 'Web');
if (!existsSync('dist/sw.js') || !existsSync('dist/registerSW.js') || !hasWorkbox()) {
  throw new Error('Web build is missing service-worker artifacts');
}

build(tauriEnv, 'Tauri');
if (existsSync('dist/sw.js') || existsSync('dist/registerSW.js') || hasWorkbox()) {
  throw new Error('Tauri build must not contain service-worker artifacts');
}

console.log('PWA artifact verification passed: Web has SW/workbox, Tauri has none.');
