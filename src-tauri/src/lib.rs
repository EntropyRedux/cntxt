mod commands;

use serde_json::{json, Value};
use tauri::Manager;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::Emitter;
use tokio::sync::Mutex;
use uuid::Uuid;

pub struct AppState {
    pub session_id: String,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            session_id: Uuid::new_v4().to_string(),
        }
    }
}

#[tauri::command]
async fn get_app_info(window: tauri::Window, state: tauri::State<'_, Mutex<AppState>>) -> Result<Value, String> {
    if !commands::is_authorized_window(&window) {
        return Err("Unauthorized window origin for application metadata".into());
    }
    let state = state.lock().await;
    Ok(json!({
        "name": "CNTXT",
        "version": env!("CARGO_PKG_VERSION"),
        "session_id": state.session_id,
        "platform": std::env::consts::OS,
    }))
}

#[tauri::command]
async fn get_system_info(window: tauri::Window) -> Result<Value, String> {
    if !commands::is_authorized_window(&window) {
        return Err("Unauthorized window origin for system metadata".into());
    }
    Ok(json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}

#[tauri::command]
async fn open_external(
    window: tauri::Window,
    url: String,
    auth_token: Option<String>,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    if !commands::is_authorized_window(&window) {
        return Err("Unauthorized window origin for external process execution".into());
    }

    let token = auth_token.unwrap_or_default();
    if token.trim().is_empty() {
        return Err("Missing required authorization token".into());
    }
    let app_state = state.lock().await;
    if token.trim() != &app_state.session_id {
        return Err("Invalid authorization token".into());
    }

    let trimmed = url.trim();
    if !trimmed.starts_with("https://") && !trimmed.starts_with("http://") {
        return Err("Only https:// and http:// URLs are permitted".into());
    }

    let forbidden_chars = ['\0', '\n', '\r', '"', '\'', '`', '$', '<', '>', '|'];
    if trimmed.chars().any(|c| forbidden_chars.contains(&c)) {
        return Err("URL contains illegal characters".into());
    }

    open::that_detached(trimmed).map_err(|e| format!("Failed to open URL: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn new_window(window: tauri::Window, app_handle: tauri::AppHandle) -> Result<(), String> {
    if !commands::is_authorized_window(&window) {
        return Err("Unauthorized window origin for window creation".into());
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let new_label = format!("window-{}", Uuid::new_v4());
        tauri::WebviewWindowBuilder::new(&app_handle, &new_label, tauri::WebviewUrl::default())
            .title("CNTXT")
            .inner_size(1280.0, 800.0)
            .min_inner_size(400.0, 350.0)
            .resizable(true)
            .decorations(false)
            .transparent(false)
            .theme(Some(tauri::Theme::Dark))
            .shadow(true)
            .build()
            .map_err(|e| format!("Failed to create window: {}", e))?;
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = app_handle;
    }
    Ok(())
}

#[tauri::command]
async fn get_pending_files(window: tauri::Window, state: tauri::State<'_, Mutex<Vec<String>>>) -> Result<Vec<String>, String> {
    if !commands::is_authorized_window(&window) {
        return Err("Unauthorized window origin for file parameters".into());
    }
    let mut files = state.lock().await;
    let to_return = files.clone();
    files.clear();
    Ok(to_return)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let file_paths: Vec<String> = args
                .iter()
                .skip(1)
                .filter(|arg| !arg.starts_with('-'))
                .filter(|arg| std::path::Path::new(arg).exists())
                .cloned()
                .collect();

            if !file_paths.is_empty() {
                let _ = app.emit("open-files", file_paths);
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }));
    }

    builder = builder.plugin(tauri_plugin_dialog::init());

    builder
        .setup(|app| {
            app.manage(Mutex::new(AppState::default()));
            app.manage(commands::storage::KvStore::default());

            let args: Vec<String> = std::env::args().collect();
            let file_paths: Vec<String> = args
                .iter()
                .skip(1)
                .filter(|arg| !arg.starts_with('-'))
                .filter(|arg| std::path::Path::new(arg).exists())
                .cloned()
                .collect();

            app.manage(Mutex::new(file_paths));

            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::unmaximize_window,
            commands::window::close_window,
            commands::window::is_maximized,
            commands::window::start_dragging,
            commands::window::toggle_maximize,
            commands::window::open_devtools,
            commands::window::toggle_devtools,
            commands::file::read_file,
            commands::file::write_file,
            commands::file::open_file_dialog,
            commands::file::save_file_dialog,
            commands::file::get_file_name,
            commands::file::detect_language_from_path,
            commands::file::get_file_modified_time,
            commands::file::open_folder_dialog,
            commands::file::read_directory,
            commands::file::rename_file,
            commands::file::delete_file,
            commands::file::open_file_explorer,
            commands::file::get_dir_name,
            commands::secrets::store_api_key,
            commands::secrets::get_api_key,
            commands::secrets::delete_api_key,
            commands::secrets::has_api_key,
            commands::storage::kv_get,
            commands::storage::kv_set,
            commands::storage::kv_remove,
            commands::storage::kv_has,
            commands::clipboard::clipboard_read_text,
            commands::clipboard::clipboard_write_text,
            get_pending_files,

            get_app_info,
            get_system_info,
            open_external,
            new_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
