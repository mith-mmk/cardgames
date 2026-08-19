# Mobile targets

## Android

The Android target lives in `src-tauri/gen/android` and is committed so native
orientation and application settings can be reviewed with the web UI changes.
`MainActivity` is locked to `sensorLandscape`, allowing either landscape
direction while rejecting portrait. Do not build this target in this release.

## iOS

iOS target generation requires macOS with Xcode. On that host, run
`npm run tauri -- ios init`, then set these keys in the generated app
`Info.plist` for both the iPhone and iPad orientation arrays:

- `UIInterfaceOrientationLandscapeLeft`
- `UIInterfaceOrientationLandscapeRight`

Do not include either portrait orientation. The shared responsive UI and
Playwright landscape checks are platform-neutral and are implemented before
the generated iOS project is available.
