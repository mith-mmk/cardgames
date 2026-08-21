import { readFileSync } from 'node:fs';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const tauriConfig = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const manifest = readFileSync('src-tauri/gen/android/app/src/main/AndroidManifest.xml', 'utf8');
const gradle = readFileSync('src-tauri/gen/android/app/build.gradle.kts', 'utf8');
const activity = readFileSync(
  'src-tauri/gen/android/app/src/main/java/com/solitairecollections/client/MainActivity.kt',
  'utf8',
);
const theme = readFileSync('src-tauri/gen/android/app/src/main/res/values/themes.xml', 'utf8');
const nightTheme = readFileSync(
  'src-tauri/gen/android/app/src/main/res/values-night/themes.xml',
  'utf8',
);
const windowsBuildScript = readFileSync('build-android.bat', 'utf8');
const posixBuildScript = readFileSync('build-android.sh', 'utf8');

function requireMatch(content, pattern, message) {
  if (!pattern.test(content)) {
    throw new Error(message);
  }
}

if (rootPackage.version !== tauriConfig.version) {
  throw new Error('package.json and tauri.conf.json versions must match.');
}

const identifier = tauriConfig.identifier;
if (!gradle.includes(`namespace = "${identifier}"`)) {
  throw new Error('Android namespace must match the Tauri identifier.');
}
if (!gradle.includes(`applicationId = "${identifier}"`)) {
  throw new Error('Android applicationId must match the Tauri identifier.');
}

requireMatch(
  manifest,
  /android:screenOrientation="sensorLandscape"/,
  'Android activity must be locked to either landscape direction.',
);
requireMatch(
  manifest,
  /android:windowLayoutInDisplayCutoutMode="shortEdges"/,
  'Android activity must allow the safe-area-aware web UI to use display cutouts.',
);
requireMatch(
  manifest,
  /android:windowSoftInputMode="adjustResize"/,
  'Android activity must resize for the on-screen keyboard.',
);
requireMatch(
  manifest,
  /android:usesCleartextTraffic="\$\{usesCleartextTraffic\}"/,
  'Clear-text traffic must be a build-type placeholder, never enabled for release by default.',
);
requireMatch(
  gradle,
  /manifestPlaceholders\["usesCleartextTraffic"\] = "false"/,
  'Release Android builds must keep clear-text traffic disabled.',
);
requireMatch(
  gradle,
  /versionName = tauriProperties\.getProperty\("tauri\.android\.versionName"/,
  'Android versionName must be supplied by Tauri from the shared application version.',
);
requireMatch(gradle, /minSdk = 24/, 'Android minSdk must remain 24 or newer.');
requireMatch(
  activity,
  /class MainActivity : TauriActivity\(\)/,
  'MainActivity must retain the Tauri activity base class.',
);
requireMatch(
  activity,
  /enableEdgeToEdge\([\s\S]*SystemBarStyle\.dark[\s\S]*super\.onCreate/,
  'MainActivity must configure dark edge-to-edge system bars before Tauri starts.',
);
for (const activeTheme of [theme, nightTheme]) {
  requireMatch(
    activeTheme,
    /android:windowLightStatusBar">false/,
    'Android theme must keep status-bar icons readable over the game table.',
  );
  requireMatch(
    activeTheme,
    /android:windowLightNavigationBar">false/,
    'Android theme must keep navigation-bar icons readable over the game table.',
  );
}

for (const [platform, script] of [
  ['Windows', windowsBuildScript],
  ['POSIX', posixBuildScript],
]) {
  const verifyIndex = script.indexOf('npm run tauri:android:verify');
  const buildIndex = script.indexOf('npm run tauri:android:build');
  if (verifyIndex === -1 || buildIndex === -1 || verifyIndex > buildIndex) {
    throw new Error(`${platform} Android build script must verify before packaging.`);
  }
}

console.log(
  `Android native target verified: ${identifier} ${tauriConfig.version}, landscape-only, edge-to-edge, release clear-text disabled.`,
);
