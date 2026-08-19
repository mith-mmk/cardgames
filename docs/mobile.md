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
