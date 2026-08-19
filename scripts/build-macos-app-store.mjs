import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const node = process.execPath;
const tauri = resolve('node_modules', '@tauri-apps', 'cli', 'tauri.js');
const baseConfig = JSON.parse(readFileSync(join('src-tauri', 'tauri.conf.json'), 'utf8'));
const appStoreConfig = JSON.parse(
  readFileSync(join('src-tauri', 'tauri.appstore.conf.json'), 'utf8'),
);
const profile = process.env.MACOS_APP_STORE_PROVISION_PROFILE;
const installerIdentity = process.env.MACOS_INSTALLER_SIGNING_IDENTITY;

if (!profile || !existsSync(profile))
  throw new Error(
    'MACOS_APP_STORE_PROVISION_PROFILE must point to the App Store provisioning profile.',
  );
if (!installerIdentity)
  throw new Error(
    'MACOS_INSTALLER_SIGNING_IDENTITY must name the Mac Installer Distribution certificate.',
  );

const tempDirectory = resolve('.test-macos-app-store');
rmSync(tempDirectory, { recursive: true, force: true });
mkdirSync(tempDirectory, { recursive: true });

try {
  const config = {
    ...appStoreConfig,
    bundle: {
      ...appStoreConfig.bundle,
      macOS: {
        ...appStoreConfig.bundle.macOS,
        files: { 'embedded.provisionprofile': profile },
      },
    },
  };
  const configPath = join(tempDirectory, 'tauri.appstore.generated.json');
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  execFileSync(node, [tauri, 'build', '--no-bundle'], { stdio: 'inherit' });
  execFileSync(
    node,
    [
      tauri,
      'bundle',
      '--bundles',
      'app',
      '--target',
      'universal-apple-darwin',
      '--config',
      configPath,
    ],
    { stdio: 'inherit' },
  );

  const appPath = resolve(
    'src-tauri',
    'target',
    'universal-apple-darwin',
    'release',
    'bundle',
    'macos',
    `${baseConfig.productName}.app`,
  );
  if (!existsSync(appPath))
    throw new Error(`Expected App Store bundle was not created: ${appPath}`);

  const packageDirectory = resolve(
    'src-tauri',
    'target',
    'universal-apple-darwin',
    'release',
    'bundle',
    'pkg',
  );
  mkdirSync(packageDirectory, { recursive: true });
  const packagePath = join(packageDirectory, `${baseConfig.productName}.pkg`);
  execFileSync(
    'xcrun',
    [
      'productbuild',
      '--sign',
      installerIdentity,
      '--component',
      appPath,
      '/Applications',
      packagePath,
    ],
    { stdio: 'inherit' },
  );
  console.log(`Created App Store package: ${packagePath}`);
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
