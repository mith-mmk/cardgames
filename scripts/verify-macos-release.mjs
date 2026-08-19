import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const [artifact] = process.argv.slice(2);
if (!artifact)
  throw new Error('Usage: npm run tauri:mac:verify-release -- <signed .app, .dmg, or .pkg>');
if (!existsSync(artifact)) throw new Error(`Release artifact does not exist: ${artifact}`);

if (artifact.endsWith('.app')) {
  execFileSync('codesign', ['--verify', '--deep', '--strict', artifact], { stdio: 'inherit' });
  execFileSync('spctl', ['--assess', '--type', 'execute', '--verbose=4', artifact], {
    stdio: 'inherit',
  });
} else if (artifact.endsWith('.dmg')) {
  execFileSync('xcrun', ['stapler', 'validate', artifact], { stdio: 'inherit' });
} else if (artifact.endsWith('.pkg')) {
  execFileSync('xcrun', ['stapler', 'validate', artifact], { stdio: 'inherit' });
  execFileSync('spctl', ['--assess', '--type', 'install', '--verbose=4', artifact], {
    stdio: 'inherit',
  });
} else {
  throw new Error(`Unsupported release artifact: ${artifact}`);
}

console.log(`Verified release artifact: ${artifact}`);
