#!/usr/bin/env sh
set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

# Build a Universal macOS .app and DMG. Apple signing and notarization are
# applied automatically when the documented release credentials are present.
npm run tauri:mac:dmg
npm run build
