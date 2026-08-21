# Platform support

Solitaire Collections is a single React/Vite frontend packaged with Tauri 2.
The desktop configuration keeps Tauri bundling enabled for all desktop targets.
CI currently performs required builds on Windows, Ubuntu, and macOS, covering
the Windows installers, Linux packages (including AppImage/deb where supported
by the runner), and the macOS application/dmg workflow.

Android has a versioned Tauri native shell in `src-tauri/gen/android`. It locks
phones to sensor landscape, handles cutouts/soft-keyboard resizing edge to
edge, and keeps release clear-text traffic disabled. The
`tauri:android:verify` script validates those native contracts; Android
packaging and device signing remain a separate release action.
The iOS target is initialized in `src-tauri/gen/apple` and is versioned with
landscape-only iPhone and iPad orientation entries. Physical-device development
still requires macOS, Xcode, CocoaPods, an Apple Developer team, and a connected
trusted device.

The app remains offline-first and stores data locally. Platform-specific storage,
permissions, signing, and store metadata are not part of the current release.
