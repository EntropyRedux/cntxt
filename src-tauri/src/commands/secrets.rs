#[cfg(not(any(target_os = "android", target_os = "ios")))]
use keyring::Entry;

use tauri::Window;

const SERVICE_NAME: &str = "CNTXT";
const LEGACY_SERVICE_NAME: &str = "ContextPad";

#[tauri::command]
pub fn store_api_key(
    window: Window,
    provider: String,
    key: String,
    session_token: Option<String>,
) -> Result<(), String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin or missing session token for keyring operation".to_string());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let secret_key = format!("api_key_{}", provider);
        let entry = Entry::new(SERVICE_NAME, &secret_key)
            .map_err(|e| format!("Failed to create OS Keyring entry: {}", e))?;
        entry.set_password(&key)
            .map_err(|e| format!("Failed to store secret in OS Keyring: {}", e))?;
        Ok(())
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = provider;
        let _ = key;
        Err("Mobile secure keystore integration required. Plaintext credential storage is prohibited.".to_string())
    }
}

#[tauri::command]
pub fn get_api_key(
    window: Window,
    provider: String,
    session_token: Option<String>,
) -> Result<String, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin or missing session token for keyring operation".to_string());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let secret_key = format!("api_key_{}", provider);

        // 1. Try CNTXT service name in OS Keyring
        if let Ok(entry) = Entry::new(SERVICE_NAME, &secret_key) {
            match entry.get_password() {
                Ok(password) => return Ok(password),
                Err(keyring::Error::NoEntry) => {}
                Err(e) => return Err(format!("Keyring error: {}", e)),
            }
        }

        // 2. Try legacy ContextPad service name in OS Keyring
        if let Ok(entry) = Entry::new(LEGACY_SERVICE_NAME, &secret_key) {
            match entry.get_password() {
                Ok(password) => return Ok(password),
                Err(keyring::Error::NoEntry) => {}
                Err(e) => return Err(format!("Keyring error: {}", e)),
            }
        }

        Err("API key not found".to_string())
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = provider;
        Err("Mobile secure keystore integration required.".to_string())
    }
}

#[tauri::command]
pub fn delete_api_key(
    window: Window,
    provider: String,
    session_token: Option<String>,
) -> Result<(), String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin or missing session token for keyring operation".to_string());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let secret_key = format!("api_key_{}", provider);

        if let Ok(entry) = Entry::new(SERVICE_NAME, &secret_key) {
            if let Err(e) = entry.delete_credential() {
                if !matches!(e, keyring::Error::NoEntry) {
                    return Err(format!("Failed to delete credential from keyring: {}", e));
                }
            }
        }

        if let Ok(entry) = Entry::new(LEGACY_SERVICE_NAME, &secret_key) {
            if let Err(e) = entry.delete_credential() {
                if !matches!(e, keyring::Error::NoEntry) {
                    return Err(format!("Failed to delete legacy credential from keyring: {}", e));
                }
            }
        }

        Ok(())
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = provider;
        Err("Mobile secure keystore integration required.".to_string())
    }
}

#[tauri::command]
pub fn has_api_key(
    window: Window,
    provider: String,
    session_token: Option<String>,
) -> Result<bool, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin or missing session token for keyring operation".to_string());
    }

    match get_api_key(window, provider, session_token) {
        Ok(_) => Ok(true),
        Err(e) if e == "API key not found" => Ok(false),
        Err(e) => Err(e),
    }
}
