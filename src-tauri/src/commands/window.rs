use tauri::Window;

#[tauri::command]
pub fn minimize_window(window: Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn maximize_window(window: Window) {
    let _ = window.maximize();
}

#[tauri::command]
pub fn unmaximize_window(window: Window) {
    let _ = window.unmaximize();
}

#[tauri::command]
pub fn close_window(window: Window) {
    let _ = window.close();
}

#[tauri::command]
pub fn is_maximized(window: Window) -> bool {
    window.is_maximized().unwrap_or(false)
}
