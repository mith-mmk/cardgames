import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const appleRoot = join('src-tauri', 'gen', 'apple');
const tauriConfig = JSON.parse(readFileSync(join('src-tauri', 'tauri.conf.json'), 'utf8'));

const cargoMetadata = JSON.parse(
  execFileSync(
    'cargo',
    [
      'metadata',
      '--manifest-path',
      join('src-tauri', 'Cargo.toml'),
      '--no-deps',
      '--format-version',
      '1',
    ],
    { encoding: 'utf8' },
  ),
);
const cargoPackage = cargoMetadata.packages.find((entry) => entry.name === 'solitaire-collections');
const mobileLibrary = cargoPackage?.targets.find((target) =>
  ['staticlib', 'cdylib', 'rlib'].every((crateType) => target.crate_types.includes(crateType)),
);
if (!mobileLibrary)
  throw new Error(
    'iOS requires a Rust library target with staticlib, cdylib, and rlib crate types.',
  );

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

function plistString(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`<key>${escapedKey}</key>\\s*<string>([^<]+)</string>`));
  return match?.[1];
}

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
  for (const key of ['CFBundleShortVersionString', 'CFBundleVersion']) {
    if (plistString(content, key) !== tauriConfig.version)
      throw new Error(`${path} ${key} must match Tauri version ${tauriConfig.version}.`);
  }
  if (!plistString(content, 'NSLocalNetworkUsageDescription'))
    throw new Error(`${path} must describe why development builds access the local network.`);
  if (process.platform === 'darwin') execFileSync('plutil', ['-lint', path], { stdio: 'pipe' });
}

const project = readFileSync(join(appleRoot, 'project.yml'), 'utf8');
for (const line of [
  `CFBundleShortVersionString: ${tauriConfig.version}`,
  `CFBundleVersion: "${tauriConfig.version}"`,
  'NSLocalNetworkUsageDescription: Solitaire Collections connects to the development server on your local network while you test the app.',
]) {
  if (!project.includes(line))
    throw new Error(`src-tauri/gen/apple/project.yml must keep ${line}.`);
}

const validation =
  process.platform === 'darwin' ? 'including plutil syntax checks' : 'with XML checks';
console.log(
  `Verified ${infoPlists.length} iOS Info.plist file(s) for landscape-only play ${validation}.`,
);
