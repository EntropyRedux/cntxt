pub mod window;
pub mod file;
pub mod secrets;
pub mod storage;
pub mod clipboard;

pub fn is_authorized_window(window: &tauri::Window) -> bool {
    let label = window.label();
    label == "main" || label.starts_with("window-")
}
