/// Clipboard access via `arboard`.
/// On Windows, arboard requires its own thread with a message loop,
/// so clipboard calls run inside a dedicated thread.
#[tauri::command]
pub fn clipboard_read_text() -> Result<String, String> {
    std::thread::spawn(|| -> Result<String, String> {
        let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
        clipboard.get_text().map_err(|e| e.to_string())
    })
    .join()
    .map_err(|_| "Clipboard thread panicked".to_string())?
}

#[tauri::command]
pub fn clipboard_write_text(text: String) -> Result<(), String> {
    std::thread::spawn(move || -> Result<(), String> {
        let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
        clipboard.set_text(text).map_err(|e| e.to_string())
    })
    .join()
    .map_err(|_| "Clipboard thread panicked".to_string())?
}