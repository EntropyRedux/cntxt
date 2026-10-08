pub mod window;
pub mod file;
pub mod secrets;
pub mod storage;
pub mod clipboard;
pub mod auth;

use std::sync::RwLock;
use std::collections::HashSet;

static SESSION_TOKEN: RwLock<Option<String>> = RwLock::new(None);
static CLAIMED_WINDOWS: RwLock<Option<HashSet<String>>> = RwLock::new(None);

pub fn init_session_token(token: String) {
    if let Ok(mut lock) = SESSION_TOKEN.write() {
        *lock = Some(token);
    }
    if let Ok(mut lock) = CLAIMED_WINDOWS.write() {
        *lock = Some(HashSet::new());
    }
}

#[cfg(test)]
pub fn clear_session_token() {
    if let Ok(mut lock) = SESSION_TOKEN.write() {
        *lock = None;
    }
    if let Ok(mut lock) = CLAIMED_WINDOWS.write() {
        *lock = None;
    }
}

pub fn current_session_token() -> Option<String> {
    SESSION_TOKEN.read().ok().and_then(|lock| lock.clone())
}

pub fn is_authorized_token(token: Option<&str>) -> bool {
    let expected = current_session_token();
    match (expected, token) {
        (Some(exp), Some(provided)) => exp == provided,
        #[cfg(test)]
        (None, _) => true, // uninitialized only allowed in test builds
        #[cfg(not(test))]
        (None, _) => false, // fail closed in production
        (Some(_), None) => false, // initialized, missing token
    }
}

pub fn is_authorized_label(label: &str) -> bool {
    label == "main" || label.starts_with("window-")
}

pub fn is_authorized_window(window: &tauri::Window) -> bool {
    is_authorized_label(window.label())
}

pub fn is_authorized_request(window: &tauri::Window, token: Option<&str>) -> bool {
    is_authorized_window(window) && is_authorized_token(token)
}

#[tauri::command]
pub async fn get_session_token(window: tauri::Window) -> Result<String, String> {
    if !is_authorized_window(&window) {
        return Err("Unauthorized window origin".into());
    }

    let label = window.label().to_string();
    if let Ok(mut lock) = CLAIMED_WINDOWS.write() {
        let set = lock.get_or_insert_with(HashSet::new);
        if set.contains(&label) {
            return Err("Session token already claimed for this window".into());
        }
        set.insert(label);
    }

    current_session_token().ok_or_else(|| "Session token not initialized".into())
}

