#[cfg(target_os = "ios")]
use std::ffi::c_void;
#[cfg(target_os = "ios")]
use tauri::Manager;

#[cfg(target_os = "ios")]
fn lock_tauri_view_controller_to_landscape(view_controller: *mut c_void) {
    use objc2::{msg_send, runtime::AnyObject};

    // Tauri's iOS runtime exposes this controller through `with_webview`. Its
    // setter is the runtime-supported path that updates the controller's
    // orientation mask and asks UIKit to rotate to the device orientation.
    let controller = unsafe { &*view_controller.cast::<AnyObject>() };
    let _: () = unsafe { msg_send![controller, setSupportedInterfaceOrientations: 24usize] };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "ios")]
    let builder = builder.setup(|app| {
        let webview_window = app
            .get_webview_window("main")
            .expect("the main iOS webview must exist before setup");
        webview_window.as_ref().with_webview(|native_webview| {
            lock_tauri_view_controller_to_landscape(native_webview.view_controller());
        })?;
        Ok(())
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running Solitaire Collections");
}
