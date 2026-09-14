use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tokio::sync::Mutex;

/// File-backed KV store persisted under the app data directory.
/// The on-disk file is the source of truth, so multiple windows and
/// app restarts all observe the same state.
pub struct KvStore(pub Mutex<HashMap<String, String>>);

impl KvStore {
    fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
        Ok(dir.join("kv_store.json"))
    }
}

async fn load(app: &tauri::AppHandle, data: &Mutex<HashMap<String, String>>) {
    let Ok(path) = KvStore::store_path(app) else {
        return;
    };
    let Ok(raw) = fs::read_to_string(&path) else {
        return;
    };
    if let Ok(parsed) = serde_json::from_str::<HashMap<String, String>>(&raw) {
        *data.lock().await = parsed;
    }
}

async fn save(app: &tauri::AppHandle, data: &Mutex<HashMap<String, String>>) -> Result<(), String> {
    let path = KvStore::store_path(app)?;
    let snapshot = data.lock().await.clone();
    let raw = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| format!("Failed to persist kv store: {}", e))
}

use tauri::Window;

#[tauri::command]
pub async fn kv_get(window: Window, app: tauri::AppHandle, state: tauri::State<'_, KvStore>, key: String) -> Result<Option<String>, String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin".into());
    }
    load(&app, &state.0).await;
    Ok(state.0.lock().await.get(&key).cloned())
}

#[tauri::command]
pub async fn kv_set(window: Window, app: tauri::AppHandle, state: tauri::State<'_, KvStore>, key: String, value: String) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin".into());
    }
    load(&app, &state.0).await;
    state.0.lock().await.insert(key, value);
    save(&app, &state.0).await
}

#[tauri::command]
pub async fn kv_remove(window: Window, app: tauri::AppHandle, state: tauri::State<'_, KvStore>, key: String) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin".into());
    }
    load(&app, &state.0).await;
    state.0.lock().await.remove(&key);
    save(&app, &state.0).await
}

#[tauri::command]
pub async fn kv_has(window: Window, app: tauri::AppHandle, state: tauri::State<'_, KvStore>, key: String) -> Result<bool, String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin".into());
    }
    load(&app, &state.0).await;
    Ok(state.0.lock().await.contains_key(&key))
}