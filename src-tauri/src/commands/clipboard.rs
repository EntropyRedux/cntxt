use tauri::Window;

/// Clipboard access via `arboard` on desktop.
/// On Windows, arboard requires its own thread with a message loop,
/// so clipboard calls run inside a dedicated thread.
/// On mobile (Android/iOS), returns an error so invokeTauri yields null,
/// prompting the TypeScript runtime bridge to fall back to navigator.clipboard.
#[tauri::command]
pub fn clipboard_read_text(window: Window) -> Result<String, String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        std::thread::spawn(|| -> Result<String, String> {
            let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
            clipboard.get_text().map_err(|e| e.to_string())
        })
        .join()
        .map_err(|_| "Clipboard thread panicked".to_string())?
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        Err("MOBILE_DELEGATE_DOM".into())
    }
}

#[tauri::command]
pub fn clipboard_write_text(window: Window, text: String) -> Result<(), String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        std::thread::spawn(move || -> Result<(), String> {
            let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
            clipboard.set_text(text).map_err(|e| e.to_string())
        })
        .join()
        .map_err(|_| "Clipboard thread panicked".to_string())?
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = text;
        Err("MOBILE_DELEGATE_DOM".into())
    }
}