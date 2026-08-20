import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const appleRoot = join('src-tauri', 'gen', 'apple');

function findInfoPlists(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && ['Pods', 'build', 'Externals', 'xcuserdata'].includes(entry.name))
      return [];
    if (entry.isDirectory()) return findInfoPlists(path);
    return entry.name === 'Info.plist' ? [path] : [];
  });
}

if (!existsSync(appleRoot)) {
  throw new Error('The versioned iOS project is missing. Run npm run tauri:ios:init on macOS.');
}

const infoPlists = findInfoPlists(appleRoot);
if (!infoPlists.length) throw new Error('No iOS Info.plist was generated.');

for (const path of infoPlists) {
  const content = readFileSync(path, 'utf8');
  for (const orientation of [
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
  ]) {
    if (!content.includes(orientation)) throw new Error(`${path} is missing ${orientation}.`);
  }
  if (content.includes('UIInterfaceOrientationPortrait'))
    throw new Error(`${path} must not enable portrait orientation.`);
  if (process.platform === 'darwin') execFileSync('plutil', ['-lint', path], { stdio: 'pipe' });
}

const validation =
  process.platform === 'darwin' ? 'including plutil syntax checks' : 'with XML checks';
console.log(
  `Verified ${infoPlists.length} iOS Info.plist file(s) for landscape-only play ${validation}.`,
);
