# Mobile targets

## Android

The Android target lives in `src-tauri/gen/android` and is committed so native
orientation and application settings can be reviewed with the web UI changes.
`MainActivity` is locked to `sensorLandscape`, allowing either landscape
direction while rejecting portrait. Do not build this target in this release.

## iOS

The generated iOS project is versioned in `src-tauri/gen/apple`. Both iPhone and
iPad orientation arrays contain only:

- `UIInterfaceOrientationLandscapeLeft`
- `UIInterfaceOrientationLandscapeRight`

Do not add portrait orientations. On a macOS host with Xcode, CocoaPods, an
Apple Developer team, and a connected trusted device, run `npm run tauri:ios:dev`.
Use `npm run tauri:ios:verify` to validate the generated plist before review.

To compile the native iOS integration without a signing identity, run
`npm run tauri:ios:sim:build`. It creates an arm64 Simulator archive but does
not create an IPA or replace the physical-device signing check.

The iOS scripts explicitly use `src-tauri/target` for `CARGO_TARGET_DIR` so
Cargo never writes architecture-specific artifacts to the repository root. If
invoking Tauri directly, set
`CARGO_TARGET_DIR="$PWD/src-tauri/target"`; a project-root value can cause a
permission error while Cargo creates the architecture-specific build directory.

To deploy to a physical device, provide the selected Apple Developer Team only
for that command. Do not place the team ID, signing certificate, or provisioning
profile in the repository:

```sh
APPLE_DEVELOPMENT_TEAM="<TEAM_ID>" npm run tauri:ios:dev
```
