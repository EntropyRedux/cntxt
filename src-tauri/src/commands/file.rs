use tauri::Window;
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;

/// Canonicalize and validate a path.
/// Returns an error if the path contains traversal sequences after resolution.
fn validate_path(path: &str) -> Result<PathBuf, String> {
    let path_buf = PathBuf::from(path);
    let path_str = path_buf.to_string_lossy();

    if path_str.contains("..") {
        if let Ok(canonical) = std::fs::canonicalize(&path_buf) {
            return Ok(canonical);
        }
        return Err("Path traversal detected".to_string());
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
    let metadata = fs::metadata(&path)
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
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileNode>>,
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileNode>, String> {
    let dir_path = PathBuf::from(&path);

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
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename file: {}", e))
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if path_buf.is_dir() {
        fs::remove_dir_all(&path_buf)
            .map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&path_buf)
            .map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
pub async fn open_file_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
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
