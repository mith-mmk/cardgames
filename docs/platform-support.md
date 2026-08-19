# Platform support

Solitaire Collections is a single React/Vite frontend packaged with Tauri 2.
The desktop configuration keeps Tauri bundling enabled for all desktop targets.
CI currently performs required builds on Windows, Ubuntu, and macOS, covering
the Windows installers, Linux packages (including AppImage/deb where supported
by the runner), and the macOS application/dmg workflow.

Android is initialized in `src-tauri/gen/android` and locks the activity to
sensor landscape. The native tree is versioned with its orientation setting;
Android packaging is intentionally deferred until the mobile UX is validated.
The iOS target still requires macOS, Xcode, and CocoaPods. Its shared landscape
UI is implemented now, while `tauri ios init` and the generated `Info.plist`
orientation entries must be completed on a macOS release host.

The app remains offline-first and stores data locally. Platform-specific storage,
permissions, signing, and store metadata are not part of the current release.
