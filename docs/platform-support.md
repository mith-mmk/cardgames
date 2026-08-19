# Platform support

Solitaire Collections is a single React/Vite frontend packaged with Tauri 2.
The desktop configuration keeps Tauri bundling enabled for all desktop targets.
CI currently performs required builds on Windows, Ubuntu, and macOS, covering
the Windows installers, Linux packages (including AppImage/deb where supported
by the runner), and the macOS application/dmg workflow.

Android and iOS are planned Tauri 2 targets. Their SDK projects are intentionally
not checked into this repository yet: `tauri android init` requires the Android
SDK/NDK, and `tauri ios init` requires macOS, Xcode, and CocoaPods. CI verifies
that the installed Tauri CLI exposes both workflows without generating a large,
host-specific native tree. Mobile initialization and packaging should be run on
the matching release host after the mobile UX has been validated.

The app remains offline-first and stores data locally. Platform-specific storage,
permissions, signing, and store metadata are not part of the current release.
