pub mod window;
pub mod file;
pub mod secrets;
pub mod storage;
pub mod clipboard;

pub fn is_authorized_label(label: &str) -> bool {
    label == "main" || label.starts_with("window-")
}

pub fn is_authorized_window(window: &tauri::Window) -> bool {
    is_authorized_label(window.label())
}

