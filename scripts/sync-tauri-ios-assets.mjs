import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const source = join('src-tauri', 'icons', 'ios');
const destination = join('src-tauri', 'gen', 'apple', 'Assets.xcassets', 'AppIcon.appiconset');

if (!existsSync(source)) throw new Error(`The iOS icon source directory is missing: ${source}`);
if (!existsSync(destination))
  throw new Error(`The generated iOS AppIcon asset catalog is missing: ${destination}`);

const icons = readdirSync(source).filter((name) => name.endsWith('.png'));
if (!icons.length) throw new Error(`No iOS PNG icons were found in ${source}`);

for (const name of icons) {
  const target = join(destination, name);
  if (!existsSync(target)) throw new Error(`The iOS AppIcon asset catalog is missing ${name}`);
  copyFileSync(join(source, name), target);
}

console.log(`Synced ${icons.length} iOS AppIcon images.`);
