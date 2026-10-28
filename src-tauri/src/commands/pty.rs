use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalChunkPayload {
    pub id: String,
    pub stream: String,
    pub data: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalExitPayload {
    pub id: String,
    pub exit_code: Option<i32>,
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
struct ActivePty {
    writer: Arc<Mutex<Box<dyn std::io::Write + Send>>>,
    master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
static SESSIONS: RwLock<Option<HashMap<String, ActivePty>>> = RwLock::new(None);

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn with_sessions<F, R>(f: F) -> R
where
    F: FnOnce(&mut HashMap<String, ActivePty>) -> R,
{
    let mut lock = SESSIONS.write().unwrap();
    let map = lock.get_or_insert_with(HashMap::new);
    f(map)
}

fn sanitize_command(command: &str) -> Result<String, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Command cannot be empty".to_string());
    }
    let forbidden_chars = ['\0', '\n', '\r', ';', '|', '&', '`', '$'];
    if trimmed.chars().any(|c| forbidden_chars.contains(&c)) {
        return Err("Command contains illegal characters".to_string());
    }
    Ok(trimmed.to_string())
}

#[tauri::command]
pub async fn spawn_pty(
    app: tauri::AppHandle,
    window: tauri::Window,
    session_token: Option<String>,
    id: String,
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, String> {
    if !crate::commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized request for terminal spawn".into());
    }

    let clean_cmd = sanitize_command(&command)?;
    let term_cols = cols.unwrap_or(80).clamp(10, 500);
    let term_rows = rows.unwrap_or(24).clamp(2, 200);

    let validated_cwd = if let Some(ref dir) = cwd {
        if !dir.trim().is_empty() {
            Some(crate::commands::file::validate_path(dir)?)
        } else {
            None
        }
    } else {
        None
    };

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};

        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows: term_rows,
                cols: term_cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY pair: {}", e))?;

        let mut cmd_builder = CommandBuilder::new(&clean_cmd);
        cmd_builder.args(&args);
        if let Some(dir) = validated_cwd {
            cmd_builder.cwd(dir);
        }

        let child = pair
            .slave
            .spawn_command(cmd_builder)
            .map_err(|e| format!("Failed to spawn process '{}': {}", clean_cmd, e))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone master reader: {}", e))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take master writer: {}", e))?;

        let master = pair.master;

        let channel_id = id.clone();
        let session = ActivePty {
            writer: Arc::new(Mutex::new(writer)),
            master: Arc::new(Mutex::new(master)),
            child: Arc::new(Mutex::new(child)),
        };

        with_sessions(|map| {
            map.insert(channel_id.clone(), session);
        });

        // Spawn background reader thread
        let reader_channel_id = id.clone();
        let app_handle = app.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        // EOF
                        break;
                    }
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        let event_name = format!("terminal:chunk:{}", reader_channel_id);
                        let payload = TerminalChunkPayload {
                            id: reader_channel_id.clone(),
                            stream: "stdout".to_string(),
                            data: text,
                        };
                        let _ = app_handle.emit(&event_name, payload);
                    }
                    Err(_) => {
                        break;
                    }
                }
            }

            // Process exited / EOF reached
            let exit_code = with_sessions(|map| {
                if let Some(pty) = map.get(&reader_channel_id) {
                    if let Ok(mut child_lock) = pty.child.lock() {
                        let _ = child_lock.wait();
                    }
                }
                None
            });

            let exit_event = format!("terminal:exit:{}", reader_channel_id);
            let exit_payload = TerminalExitPayload {
                id: reader_channel_id.clone(),
                exit_code,
            };
            let _ = app_handle.emit(&exit_event, exit_payload);

            with_sessions(|map| {
                map.remove(&reader_channel_id);
            });
        });

        Ok(id)
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = (app, clean_cmd, term_cols, term_rows, validated_cwd);
        Err("Terminal PTY is not supported on mobile platforms".to_string())
    }
}

#[tauri::command]
pub async fn write_pty(
    window: tauri::Window,
    session_token: Option<String>,
    id: String,
    data: String,
) -> Result<(), String> {
    if !crate::commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized request for terminal write".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let writer_opt = with_sessions(|map| {
            map.get(&id).map(|pty| Arc::clone(&pty.writer))
        });

        if let Some(writer_arc) = writer_opt {
            let mut writer = writer_arc
                .lock()
                .map_err(|_| "Failed to acquire PTY writer lock".to_string())?;
            writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write to PTY: {}", e))?;
            writer
                .flush()
                .map_err(|e| format!("Failed to flush PTY writer: {}", e))?;
            Ok(())
        } else {
            Err(format!("Terminal session '{}' not found", id))
        }
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = (id, data);
        Err("Terminal PTY is not supported on mobile platforms".to_string())
    }
}

#[tauri::command]
pub async fn resize_pty(
    window: tauri::Window,
    session_token: Option<String>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    if !crate::commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized request for terminal resize".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use portable_pty::PtySize;

        let master_opt = with_sessions(|map| {
            map.get(&id).map(|pty| Arc::clone(&pty.master))
        });

        if let Some(master_arc) = master_opt {
            let master = master_arc
                .lock()
                .map_err(|_| "Failed to acquire PTY master lock".to_string())?;
            master
                .resize(PtySize {
                    rows: rows.clamp(2, 200),
                    cols: cols.clamp(10, 500),
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Failed to resize PTY: {}", e))?;
            Ok(())
        } else {
            Err(format!("Terminal session '{}' not found", id))
        }
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = (id, cols, rows);
        Err("Terminal PTY is not supported on mobile platforms".to_string())
    }
}

#[tauri::command]
pub async fn kill_pty(
    window: tauri::Window,
    session_token: Option<String>,
    id: String,
) -> Result<(), String> {
    if !crate::commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized request for terminal kill".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let child_opt = with_sessions(|map| {
            map.get(&id).map(|pty| Arc::clone(&pty.child))
        });

        if let Some(child_arc) = child_opt {
            let mut child = child_arc
                .lock()
                .map_err(|_| "Failed to acquire PTY child lock".to_string())?;
            let _ = child.kill();
            with_sessions(|map| {
                map.remove(&id);
            });
            Ok(())
        } else {
            // Already dead or cleaned up
            with_sessions(|map| {
                map.remove(&id);
            });
            Ok(())
        }
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = id;
        Err("Terminal PTY is not supported on mobile platforms".to_string())
    }
}

#[tauri::command]
pub async fn list_pty_sessions(
    window: tauri::Window,
    session_token: Option<String>,
) -> Result<Vec<String>, String> {
    if !crate::commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized request for listing terminal sessions".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let sessions = with_sessions(|map| map.keys().cloned().collect());
        Ok(sessions)
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn spawn_external_terminal(
    window: tauri::Window,
    session_token: Option<String>,
    target_dir: String,
    shell_override: Option<String>,
) -> Result<bool, String> {
    if !crate::commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized request for spawning external terminal".into());
    }

    let canonical_dir = crate::commands::file::validate_path(&target_dir)?;

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let dir_str = canonical_dir.to_str().ok_or_else(|| "Invalid directory path".to_string())?;

        let shell = shell_override.unwrap_or_default();
        if !shell.is_empty() {
            let sanitized = sanitize_command(&shell)?;
            Command::new("cmd.exe")
                .args(["/c", "start", &sanitized])
                .current_dir(&canonical_dir)
                .spawn()
                .map_err(|e| format!("Failed to spawn shell {}: {}", sanitized, e))?;
            return Ok(true);
        }

        // Try Windows Terminal (wt.exe) first
        let wt_res = Command::new("wt.exe")
            .args(["-d", dir_str])
            .spawn();

        if wt_res.is_err() {
            // Fallback to powershell.exe with -NoExit
            Command::new("powershell.exe")
                .args(["-NoExit", "-Command", &format!("Set-Location -LiteralPath '{}'", dir_str)])
                .current_dir(&canonical_dir)
                .spawn()
                .map_err(|e| format!("Failed to spawn powershell terminal: {}", e))?;
        }
        Ok(true)
    }

    #[cfg(not(any(target_os = "windows", target_os = "android", target_os = "ios")))]
    {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            let _ = shell_override;
            Command::new("open")
                .args(["-a", "Terminal", canonical_dir.to_str().unwrap_or(".")])
                .spawn()
                .map_err(|e| format!("Failed to spawn macOS Terminal: {}", e))?;
            Ok(true)
        }
        #[cfg(not(target_os = "macos"))]
        {
            use std::process::Command;
            let shell = shell_override.unwrap_or_default();
            if !shell.is_empty() {
                let sanitized = sanitize_command(&shell)?;
                if Command::new(&sanitized)
                    .current_dir(&canonical_dir)
                    .spawn()
                    .is_ok()
                {
                    return Ok(true);
                }
            }

            if let Ok(env_term) = std::env::var("TERMINAL") {
                if !env_term.trim().is_empty() {
                    if let Ok(sanitized_term) = sanitize_command(env_term.trim()) {
                        if Command::new(&sanitized_term)
                            .current_dir(&canonical_dir)
                            .spawn()
                            .is_ok()
                        {
                            return Ok(true);
                        }
                    }
                }
            }

            let candidates = [
                "x-terminal-emulator",
                "gnome-terminal",
                "konsole",
                "xfce4-terminal",
                "alacritty",
                "kitty",
                "wezterm",
                "xterm",
            ];
            for term in candidates {
                if Command::new(term)
                    .current_dir(&canonical_dir)
                    .spawn()
                    .is_ok()
                {
                    return Ok(true);
                }
            }

            Err("Failed to spawn Linux terminal: no supported terminal emulator found in PATH".to_string())
        }
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = canonical_dir;
        let _ = shell_override;
        Err("External terminal is not supported on mobile platforms".to_string())
    }
}

