# Apple release procedure

## macOS direct distribution

1. Install a `Developer ID Application` certificate in the build keychain.
2. Provide the Tauri signing and notarization variables (`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`) through the release environment; never place them in project files.
3. Run `npm run tauri:mac:dmg` and validate the output with `npm run tauri:mac:verify-release -- <dmg-path>`.
4. Publish only the stapled DMG.

## Mac App Store

1. Provide an `Apple Distribution` certificate, `Mac Installer Distribution` identity, and a provisioning profile matching `com.solitairecollections.client`.
2. Set `MACOS_APP_STORE_PROVISION_PROFILE` to the local profile path and `MACOS_INSTALLER_SIGNING_IDENTITY` to the installer identity.
3. Run `npm run tauri:mac:app-store`, validate the generated PKG, then upload it through App Store Connect.

The manual `macOS Release` workflow expects the equivalent values as GitHub Actions secrets. It is intentionally separate from pull-request CI.

## iOS development device

1. Install the iOS Rust targets and CocoaPods, then run `npm run tauri:ios:init` once on macOS.
2. Open Xcode, sign in with the Apple Developer team, and connect the target iPhone.
3. Run `npm run tauri:ios:dev`, verify landscape-only play, offline startup, and a representative game interaction.

The iOS target is for signed development-device validation only; this procedure does not submit an IPA to TestFlight or the App Store.
