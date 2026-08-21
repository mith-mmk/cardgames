import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const appleRoot = join('src-tauri', 'gen', 'apple');
const entrypointSource = join(appleRoot, 'Sources', 'solitaire-collections', 'main.mm');
const rustLibrary = join('src-tauri', 'src', 'lib.rs');
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

const sourceIcons = join('src-tauri', 'icons', 'ios');
const generatedIcons = join(appleRoot, 'Assets.xcassets', 'AppIcon.appiconset');
if (!existsSync(sourceIcons) || !existsSync(generatedIcons))
  throw new Error('The source or generated iOS AppIcon asset catalog is missing.');
for (const name of readdirSync(sourceIcons).filter((entry) => entry.endsWith('.png'))) {
  const source = join(sourceIcons, name);
  const generated = join(generatedIcons, name);
  if (!existsSync(generated)) throw new Error(`The generated iOS AppIcon is missing ${name}.`);
  const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
  if (digest(source) !== digest(generated))
    throw new Error(`The generated iOS AppIcon ${name} does not match the source asset.`);
}

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
  if (!content.includes('<key>UIRequiresFullScreen</key>\n\t<true/>'))
    throw new Error(`${path} must require full screen to keep iPad play landscape-only.`);
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
  'UIRequiresFullScreen: true',
]) {
  if (!project.includes(line))
    throw new Error(`src-tauri/gen/apple/project.yml must keep ${line}.`);
}

if (readFileSync(entrypointSource, 'utf8').includes('InstallLandscapeOrientationLock();'))
  throw new Error(
    `${entrypointSource} must not configure orientation before Tauri creates its view.`,
  );
if (!readFileSync(rustLibrary, 'utf8').includes('setSupportedInterfaceOrientations: 24usize'))
  throw new Error(`${rustLibrary} must configure the Tauri iOS view controller directly.`);

const validation =
  process.platform === 'darwin' ? 'including plutil syntax checks' : 'with XML checks';
console.log(
  `Verified ${infoPlists.length} iOS Info.plist file(s) for landscape-only play ${validation}.`,
);
