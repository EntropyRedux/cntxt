#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod preview_server;

use serde_json::{json, Value};
use tauri::{Manager, Emitter, WebviewUrl, WebviewWindowBuilder};
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
async fn get_app_info(state: tauri::State<'_, Mutex<AppState>>) -> Result<Value, String> {
    let state = state.lock().await;
    Ok(json!({
        "name": "CNTXT",
        "version": "0.1.0",
        "session_id": state.session_id,
        "platform": std::env::consts::OS,
    }))
}

#[tauri::command]
async fn get_system_info() -> Result<Value, String> {
    Ok(json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}

#[tauri::command]
async fn open_external(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/c", "start", "", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn new_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    let new_label = format!("window-{}", Uuid::new_v4());
    WebviewWindowBuilder::new(&app_handle, &new_label, WebviewUrl::App("index.html".into()))
        .title("CNTXT")
        .inner_size(1200.0, 800.0)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn start_preview_server(state: tauri::State<'_, Mutex<preview_server::PreviewServer>>) -> Result<u16, String> {
    let mut server = state.lock().await;
    server.start().await
}

#[tauri::command]
async fn stop_preview_server(state: tauri::State<'_, Mutex<preview_server::PreviewServer>>) -> Result<(), String> {
    let mut server = state.lock().await;
    server.stop();
    Ok(())
}

#[tauri::command]
async fn update_preview_content(state: tauri::State<'_, Mutex<preview_server::PreviewServer>>, html: String) -> Result<(), String> {
    let server = state.lock().await;
    server.update_content(html);
    Ok(())
}

#[tauri::command]
async fn update_preview_settings(state: tauri::State<'_, Mutex<preview_server::PreviewServer>>, json: String) -> Result<(), String> {
    let server = state.lock().await;
    server.update_settings(json);
    Ok(())
}

#[tauri::command]
async fn get_pending_files(state: tauri::State<'_, Mutex<Vec<String>>>) -> Result<Vec<String>, String> {
    let mut files = state.lock().await;
    let to_return = files.clone();
    files.clear();
    Ok(to_return)
}

#[tauri::command]
fn confirm_close(window: tauri::Window) {
    if let Some(flag) = window.try_state::<std::sync::Mutex<bool>>() {
        *flag.lock().unwrap() = true;
    }
    let _ = window.close();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
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
        }))
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            app.manage(Mutex::new(preview_server::PreviewServer::new()));
            app.manage(Mutex::new(AppState::default()));
            app.manage(commands::storage::KvStore(tokio::sync::Mutex::new(std::collections::HashMap::new())));
            app.manage(std::sync::Mutex::new(false));

            let args: Vec<String> = std::env::args().collect();
            let file_paths: Vec<String> = args
                .iter()
                .skip(1)
                .filter(|arg| !arg.starts_with('-'))
                .filter(|arg| std::path::Path::new(arg).exists())
                .cloned()
                .collect();

            app.manage(Mutex::new(file_paths));
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let allow = if let Some(flag) = window.try_state::<std::sync::Mutex<bool>>() {
                        *flag.lock().unwrap()
                    } else {
                        false
                    };
                    if !allow {
                        api.prevent_close();
                        let _ = window.emit("app-close-requested", ());
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::unmaximize_window,
            commands::window::close_window,
            commands::window::is_maximized,
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
            start_preview_server,
            stop_preview_server,
            update_preview_content,
            update_preview_settings,
            get_pending_files,
            confirm_close,
            get_app_info,
            get_system_info,
            open_external,
            new_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
