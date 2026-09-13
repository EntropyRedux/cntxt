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

#[tauri::command]
pub fn start_dragging(window: Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
pub fn toggle_maximize(window: Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}
