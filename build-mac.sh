#!/usr/bin/env sh
set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if ! command -v rustup >/dev/null 2>&1; then
  echo "rustup is required to build the Universal macOS binary." >&2
  exit 1
fi

# The Universal target needs both Apple Silicon and Intel Rust standard
# libraries. Install a missing target before asking Tauri to merge them.
for target in aarch64-apple-darwin x86_64-apple-darwin; do
  if ! rustup target list --installed | grep -Fxq "$target"; then
    echo "Installing Rust target: $target"
    rustup target add "$target"
  fi
done

# Build a Universal macOS .app and DMG. Apple signing and notarization are
# applied automatically when the documented release credentials are present.
npm run tauri:mac:dmg
npm run build
