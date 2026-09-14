use keyring::Entry;
use tauri::Window;

#[tauri::command]
pub fn store_api_key(window: Window, provider: String, key: String) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }
    let entry = Entry::new("ContextPad", &format!("api_key_{}", provider))
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.set_password(&key)
        .map_err(|e| format!("Failed to store API key: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn get_api_key(window: Window, provider: String) -> Result<String, String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }
    let entry = Entry::new("ContextPad", &format!("api_key_{}", provider))
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.get_password()
        .map_err(|e| format!("API key not found: {}", e))
}

#[tauri::command]
pub fn delete_api_key(window: Window, provider: String) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }
    let entry = Entry::new("ContextPad", &format!("api_key_{}", provider))
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.delete_credential()
        .map_err(|e| format!("Failed to delete API key: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn has_api_key(window: Window, provider: String) -> Result<bool, String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin for keyring operations".to_string());
    }
    match get_api_key(window, provider) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
