use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use keyring::Entry;

use tauri::{AppHandle, Manager, Window};

const SERVICE_NAME: &str = "CNTXT";
const LEGACY_SERVICE_NAME: &str = "ContextPad";

/// Resolves the fallback secrets store path under the application's data directory.
fn fallback_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(dir.join(".secrets_fallback.json"))
}

/// Loads the local fallback secret map.
fn load_fallback(app: &AppHandle) -> HashMap<String, String> {
    if let Ok(path) = fallback_path(app) {
        if let Ok(raw) = fs::read_to_string(path) {
            if let Ok(map) = serde_json::from_str::<HashMap<String, String>>(&raw) {
                return map;
            }
        }
    }
    HashMap::new()
}

/// Persists or deletes a key in the local fallback store.
fn save_fallback(app: &AppHandle, key: &str, val: Option<&str>) -> Result<(), String> {
    let path = fallback_path(app)?;
    let mut map = load_fallback(app);
    if let Some(v) = val {
        map.insert(key.to_string(), v.to_string());
    } else {
        map.remove(key);
    }
    let raw = serde_json::to_string_pretty(&map).map_err(|e| e.to_string())?;

    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, raw).map_err(|e| format!("Failed to write fallback secrets: {}", e))?;
    fs::rename(&tmp_path, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn store_api_key(window: Window, app: AppHandle, provider: String, key: String) -> Result<(), String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }

    let secret_key = format!("api_key_{}", provider);
    let mut _stored_in_keyring = false;

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        // Tier 1: Try native OS Secret Service / Keyring
        if let Ok(entry) = Entry::new(SERVICE_NAME, &secret_key) {
            if entry.set_password(&key).is_ok() {
                _stored_in_keyring = true;
            }
        }
    }

    // Tier 2: If OS Keyring failed (e.g. headless/minimal Linux WM, or mobile platforms), use app fallback storage
    if !_stored_in_keyring {
        save_fallback(&app, &secret_key, Some(&key))?;
    } else {
        // Remove from fallback if previously stored there
        let _ = save_fallback(&app, &secret_key, None);
    }

    Ok(())
}

#[tauri::command]
pub fn get_api_key(window: Window, app: AppHandle, provider: String) -> Result<String, String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }

    let secret_key = format!("api_key_{}", provider);

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        // 1. Try CNTXT service name in OS Keyring
        if let Ok(entry) = Entry::new(SERVICE_NAME, &secret_key) {
            if let Ok(password) = entry.get_password() {
                return Ok(password);
            }
        }

        // 2. Try legacy ContextPad service name in OS Keyring
        if let Ok(entry) = Entry::new(LEGACY_SERVICE_NAME, &secret_key) {
            if let Ok(password) = entry.get_password() {
                return Ok(password);
            }
        }
    }

    // 3. Try fallback local storage
    let map = load_fallback(&app);
    if let Some(val) = map.get(&secret_key) {
        return Ok(val.clone());
    }

    Err("API key not found".to_string())
}

#[tauri::command]
pub fn delete_api_key(window: Window, app: AppHandle, provider: String) -> Result<(), String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }

    let secret_key = format!("api_key_{}", provider);

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if let Ok(entry) = Entry::new(SERVICE_NAME, &secret_key) {
            let _ = entry.delete_credential();
        }
        if let Ok(entry) = Entry::new(LEGACY_SERVICE_NAME, &secret_key) {
            let _ = entry.delete_credential();
        }
    }

    let _ = save_fallback(&app, &secret_key, None);

    Ok(())
}

#[tauri::command]
pub fn has_api_key(window: Window, app: AppHandle, provider: String) -> Result<bool, String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }
    match get_api_key(window, app, provider) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}