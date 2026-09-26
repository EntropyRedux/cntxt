#[cfg(not(any(target_os = "android", target_os = "ios")))]
use keyring::Entry;
#[cfg(any(target_os = "android", target_os = "ios"))]
use tauri::Manager;
use tauri::Window;

#[tauri::command]
pub fn store_api_key(window: Window, provider: String, key: String) -> Result<(), String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let entry = Entry::new("ContextPad", &format!("api_key_{}", provider))
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        
        entry.set_password(&key)
            .map_err(|e| format!("Failed to store API key: {}", e))?;
        
        Ok(())
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let app = window.app_handle();
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
        let path = dir.join("secrets_store.json");
        let mut map: std::collections::HashMap<String, String> = if path.exists() {
            let raw = std::fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&raw).unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };
        map.insert(format!("secret_api_key_{}", provider), key);
        let serialized = serde_json::to_string_pretty(&map).map_err(|e| e.to_string())?;
        let tmp_path = path.with_extension("tmp");
        std::fs::write(&tmp_path, serialized).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp_path, &path).map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub fn get_api_key(window: Window, provider: String) -> Result<String, String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let entry = Entry::new("ContextPad", &format!("api_key_{}", provider))
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        
        entry.get_password()
            .map_err(|e| format!("API key not found: {}", e))
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let app = window.app_handle();
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let path = dir.join("secrets_store.json");
        if path.exists() {
            let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let map: std::collections::HashMap<String, String> = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
            map.get(&format!("secret_api_key_{}", provider)).cloned().ok_or_else(|| "API key not found".to_string())
        } else {
            Err("API key not found".to_string())
        }
    }
}

#[tauri::command]
pub fn delete_api_key(window: Window, provider: String) -> Result<(), String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let entry = Entry::new("ContextPad", &format!("api_key_{}", provider))
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        
        entry.delete_credential()
            .map_err(|e| format!("Failed to delete API key: {}", e))?;
        
        Ok(())
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let app = window.app_handle();
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let path = dir.join("secrets_store.json");
        if path.exists() {
            let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let mut map: std::collections::HashMap<String, String> = serde_json::from_str(&raw).unwrap_or_default();
            map.remove(&format!("secret_api_key_{}", provider));
            let serialized = serde_json::to_string_pretty(&map).map_err(|e| e.to_string())?;
            let tmp_path = path.with_extension("tmp");
            std::fs::write(&tmp_path, serialized).map_err(|e| e.to_string())?;
            std::fs::rename(&tmp_path, &path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

#[tauri::command]
pub fn has_api_key(window: Window, provider: String) -> Result<bool, String> {
    if !super::is_authorized_window(&window) {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }
    match get_api_key(window, provider) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
