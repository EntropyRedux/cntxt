use tauri::Window;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Check if a canonical path points to a system root or protected directory.
fn is_system_root(canonical: &Path) -> bool {
    let canonical_str = canonical.to_string_lossy();
    let lower = canonical_str.to_lowercase();
    let stripped = if lower.starts_with(r"\\?\") {
        &lower[4..]
    } else {
        &lower
    };

    #[cfg(target_os = "windows")]
    {
        // Drive root check (e.g. "c:\" or "c:")
        if stripped.len() <= 3 && stripped.contains(':') {
            return true;
        }

        // Protected system directories across any drive
        let protected = [
            r":\windows",
            r":\program files",
            r":\program files (x86)",
            r":\programdata",
            r":\system volume information",
            r":\$recycle.bin",
            r":\recovery",
        ];
        for prefix in &protected {
            if stripped.len() > 2 && stripped[1..].starts_with(prefix) {
                return true;
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if stripped == "/" {
            return true;
        }
        let protected = [
            "/bin", "/sbin", "/etc", "/usr", "/sys", "/proc", "/dev", "/boot", "/System", "/Library", "/private"
        ];
        for prefix in &protected {
            if stripped == *prefix || stripped.starts_with(&format!("{}/", prefix)) {
                return true;
            }
        }
    }

    false
}

/// Canonicalize and validate a path against traversal and system root access.
pub fn validate_path(path: &str) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    // Unconditionally reject directory traversal sequences
    if path.contains("..") {
        return Err("Path traversal sequence '..' is prohibited".to_string());
    }

    let path_buf = PathBuf::from(path);

    // If path exists, canonicalize directly
    if path_buf.exists() {
        let canonical = fs::canonicalize(&path_buf)
            .map_err(|e| format!("Failed to canonicalize path: {}", e))?;
        if is_system_root(&canonical) {
            return Err("Access to system root directory is denied".to_string());
        }
        return Ok(canonical);
    }

    // If file doesn't exist yet (e.g. target of write_file), validate parent directory
    if let Some(parent) = path_buf.parent() {
        if !parent.as_os_str().is_empty() && parent.exists() {
            let canonical_parent = fs::canonicalize(parent)
                .map_err(|e| format!("Failed to canonicalize parent path: {}", e))?;
            if is_system_root(&canonical_parent) {
                return Err("Access to system root directory is denied".to_string());
            }
            if let Some(file_name) = path_buf.file_name() {
                return Ok(canonical_parent.join(file_name));
            }
        }
    }

    if is_system_root(&path_buf) {
        return Err("Access to system root directory is denied".to_string());
    }

    Ok(path_buf)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    let safe_path = validate_path(&path)?;
    fs::read_to_string(&safe_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    let safe_path = validate_path(&path)?;
    fs::write(&safe_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub async fn open_file_dialog(_window: Window) -> Result<Option<String>, String> {
    use rfd::FileDialog;

    let file_path = FileDialog::new()
        .add_filter("All Files", &["*"])
        .add_filter("Markdown", &["md"])
        .add_filter("Text", &["txt"])
        .add_filter("JSON", &["json"])
        .add_filter("YAML", &["yaml", "yml"])
        .add_filter("CSV", &["csv"])
        .add_filter("JavaScript", &["js", "jsx"])
        .add_filter("TypeScript", &["ts", "tsx"])
        .add_filter("Python", &["py"])
        .add_filter("Rust", &["rs"])
        .add_filter("HTML", &["html", "htm"])
        .add_filter("CSS", &["css", "scss", "sass"])
        .pick_file();

    Ok(file_path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn save_file_dialog(_window: Window, default_name: Option<String>) -> Result<Option<String>, String> {
    use rfd::FileDialog;

    let mut dialog = FileDialog::new()
        .add_filter("All Files", &["*"])
        .add_filter("Markdown", &["md"])
        .add_filter("Text", &["txt"])
        .add_filter("JSON", &["json"])
        .add_filter("YAML", &["yaml", "yml"])
        .add_filter("CSV", &["csv"])
        .add_filter("JavaScript", &["js", "jsx"])
        .add_filter("TypeScript", &["ts", "tsx"])
        .add_filter("Python", &["py"])
        .add_filter("Rust", &["rs"])
        .add_filter("HTML", &["html", "htm"])
        .add_filter("CSS", &["css", "scss", "sass"]);

    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }

    let file_path = dialog.save_file();

    Ok(file_path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn get_file_name(path: String) -> Result<String, String> {
    PathBuf::from(&path)
        .file_name()
        .and_then(|name| name.to_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid file path".to_string())
}

#[tauri::command]
pub fn detect_language_from_path(path: String) -> String {
    let path_buf = PathBuf::from(&path);
    let extension = path_buf.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    match extension {
        "md" | "markdown" => "markdown",
        "txt" => "text",
        "json" | "jsonc" => "json",
        "yaml" | "yml" => "yaml",
        "csv" => "csv",
        "js" | "jsx" | "mjs" | "cjs" => "javascript",
        "ts" | "tsx" => "typescript",
        "py" | "pyw" => "python",
        "rs" => "rust",
        "html" | "htm" => "html",
        "css" | "scss" | "sass" | "less" => "css",
        "xml" => "xml",
        "toml" => "toml",
        "sh" | "bash" => "shell",
        "c" | "h" => "c",
        "cpp" | "cc" | "cxx" | "hpp" => "cpp",
        "java" => "java",
        "go" => "go",
        "rb" => "ruby",
        "php" => "php",
        "swift" => "swift",
        "kt" | "kts" => "kotlin",
        "sql" => "sql",
        _ => "text", // Default to plain text
    }
    .to_string()
}

#[tauri::command]
pub fn get_file_modified_time(path: String) -> Result<u64, String> {
    let safe_path = validate_path(&path)?;
    let metadata = fs::metadata(&safe_path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    let modified = metadata.modified()
        .map_err(|e| format!("Failed to get modified time: {}", e))?;

    let duration = modified.duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|e| format!("Failed to calculate duration: {}", e))?;

    Ok(duration.as_secs())
}

#[tauri::command]
pub async fn open_folder_dialog(_window: Window) -> Result<Option<String>, String> {
    use rfd::FileDialog;

    let folder_path = FileDialog::new()
        .pick_folder();

    Ok(folder_path.map(|p| p.to_string_lossy().to_string()))
}

#[derive(serde::Serialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileNode>, String> {
    let dir_path = validate_path(&path)?;

    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut entries: Vec<FileNode> = Vec::new();

    let read_dir = fs::read_dir(&dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files (starting with .)
        if file_name.starts_with('.') {
            continue;
        }

        let is_dir = entry_path.is_dir();

        entries.push(FileNode {
            name: file_name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            children: None, // Will be loaded lazily
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
pub async fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    let safe_old = validate_path(&old_path)?;
    let safe_new = validate_path(&new_path)?;
    fs::rename(&safe_old, &safe_new)
        .map_err(|e| format!("Failed to rename file: {}", e))
}

#[tauri::command]
pub async fn delete_file(
    window: Window,
    path: String,
    auth_token: Option<String>,
    state: tauri::State<'_, tokio::sync::Mutex<crate::AppState>>
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin for sensitive native operation".to_string());
    }
    let token = auth_token.unwrap_or_default();
    if token.trim().is_empty() {
        return Err("Missing required authorization token".to_string());
    }
    let app_state = state.lock().await;
    if token.trim() != app_state.session_id {
        return Err("Invalid authorization token".to_string());
    }

    let safe_path = validate_path(&path)?;

    // Guard against root deletion: check parent and drive root
    if safe_path.parent().is_none() || is_system_root(&safe_path) {
        return Err("Cannot delete root directory".to_string());
    }

    if safe_path.is_dir() {
        fs::remove_dir_all(&safe_path)
            .map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&safe_path)
            .map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
pub async fn open_file_explorer(
    window: Window,
    path: String,
    auth_token: Option<String>,
    state: tauri::State<'_, tokio::sync::Mutex<crate::AppState>>
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Unauthorized window origin for file explorer invocation".to_string());
    }
    let token = auth_token.unwrap_or_default();
    if token.trim().is_empty() {
        return Err("Missing required authorization token".to_string());
    }
    let app_state = state.lock().await;
    if token.trim() != app_state.session_id {
        return Err("Invalid authorization token".to_string());
    }

    let safe_path = validate_path(&path)?;
    let path_str = safe_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path_str)
            .spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_dir_name(path: String) -> Result<String, String> {
    let path = std::path::Path::new(&path);
    if let Some(parent) = path.parent() {
        Ok(parent.to_string_lossy().into_owned())
    } else {
        Err("No parent directory found".into())
    }
}
