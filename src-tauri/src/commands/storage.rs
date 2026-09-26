use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tokio::sync::Mutex;

/// File-backed KV store persisted under the app data directory.
/// The on-disk file is the source of truth, so multiple windows and
/// app restarts all observe the same state.
pub struct KvStoreState {
    pub is_loaded: bool,
    pub data: HashMap<String, String>,
}

pub struct KvStore(pub Mutex<KvStoreState>);

impl Default for KvStore {
    fn default() -> Self {
        Self(Mutex::new(KvStoreState {
            is_loaded: false,
            data: HashMap::new(),
        }))
    }
}

impl KvStore {
    fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
        Ok(dir.join("kv_store.json"))
    }
}

async fn ensure_loaded<'a>(app: &tauri::AppHandle, state: &'a Mutex<KvStoreState>) -> tokio::sync::MutexGuard<'a, KvStoreState> {
    let mut lock = state.lock().await;
    if !lock.is_loaded {
        if let Ok(path) = KvStore::store_path(app) {
            if let Ok(raw) = fs::read_to_string(&path) {
                if let Ok(parsed) = serde_json::from_str::<HashMap<String, String>>(&raw) {
                    lock.data = parsed;
                }
            }
        }
        lock.is_loaded = true;
    }
    lock
}

use tauri::{Emitter, Window};

#[tauri::command]
pub async fn kv_get(window: Window, app: tauri::AppHandle, state: tauri::State<'_, KvStore>, key: String) -> Result<Option<String>, String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin".into());
    }
    let lock = ensure_loaded(&app, &state.0).await;
    Ok(lock.data.get(&key).cloned())
}

#[tauri::command]
pub async fn kv_set(window: Window, app: tauri::AppHandle, state: tauri::State<'_, KvStore>, key: String, value: String) -> Result<(), String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin".into());
    }
    let path = KvStore::store_path(&app)?;
    let snapshot = {
        let mut lock = ensure_loaded(&app, &state.0).await;
        lock.data.insert(key.clone(), value);
        lock.data.clone()
    };
    // Fan-out to ALL windows explicitly — app.emit() targets only the
    // current webview in some production builds; emit_to() per window
    // is the reliable cross-window broadcast pattern in Tauri v2.
    let payload = serde_json::json!({ "key": &key });
    for (label, _) in app.webview_windows() {
        let _ = app.emit_to(label.as_str(), "storage_changed", &payload);
    }
    tokio::task::spawn_blocking(move || {
        let raw = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
        fs::write(&path, raw).map_err(|e| format!("Failed to persist kv store: {}", e))
    }).await.map_err(|e| e.to_string())?
}


#[tauri::command]
pub async fn kv_remove(window: Window, app: tauri::AppHandle, state: tauri::State<'_, KvStore>, key: String) -> Result<(), String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin".into());
    }
    let path = KvStore::store_path(&app)?;
    let snapshot = {
        let mut lock = ensure_loaded(&app, &state.0).await;
        lock.data.remove(&key);
        lock.data.clone()
    };
    // Fan-out to ALL windows explicitly (same fix as kv_set).
    let payload = serde_json::json!({ "key": &key });
    for (label, _) in app.webview_windows() {
        let _ = app.emit_to(label.as_str(), "storage_changed", &payload);
    }
    tokio::task::spawn_blocking(move || {
        let raw = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
        fs::write(&path, raw).map_err(|e| format!("Failed to persist kv store: {}", e))
    }).await.map_err(|e| e.to_string())?
}


#[tauri::command]
pub async fn kv_has(window: Window, app: tauri::AppHandle, state: tauri::State<'_, KvStore>, key: String) -> Result<bool, String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin".into());
    }
    let lock = ensure_loaded(&app, &state.0).await;
    Ok(lock.data.contains_key(&key))
}