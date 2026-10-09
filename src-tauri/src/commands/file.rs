use tauri::Window;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Check if a canonical path points to a system root or protected directory.
pub fn is_system_root(canonical: &Path) -> bool {
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

        // Check canonical APPDATA and LOCALAPPDATA environment roots
        if let Ok(appdata) = std::env::var("APPDATA") {
            let appdata_clean = strip_verbatim_prefix(&PathBuf::from(appdata)).to_string_lossy().to_lowercase();
            if stripped == appdata_clean || stripped == format!(r"{}\roaming", appdata_clean) {
                return true;
            }
        }
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            let local_clean = strip_verbatim_prefix(&PathBuf::from(localappdata)).to_string_lossy().to_lowercase();
            if stripped == local_clean {
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

/// Helper to strip Windows UNC verbatim prefix (\\?\) so paths remain clean standard paths.
pub fn strip_verbatim_prefix(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        path.to_path_buf()
    }
}

/// Canonicalize and validate a path against traversal and system root access.
pub fn validate_path(path: &str) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let path_buf = PathBuf::from(path);

    // Reject true directory traversal sequences (ParentDir components)
    if path_buf.components().any(|c| c == std::path::Component::ParentDir) {
        return Err("Path traversal sequence '..' is prohibited".to_string());
    }

    // If path exists, canonicalize directly
    if path_buf.exists() {
        let canonical = fs::canonicalize(&path_buf)
            .map_err(|e| format!("Failed to canonicalize path: {}", e))?;
        if is_system_root(&canonical) {
            return Err("Access to system root directory is denied".to_string());
        }
        return Ok(strip_verbatim_prefix(&canonical));
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
                return Ok(strip_verbatim_prefix(&canonical_parent.join(file_name)));
            }
        }
    }

    if is_system_root(&path_buf) {
        return Err("Access to system root directory is denied".to_string());
    }

    Ok(strip_verbatim_prefix(&path_buf))
}

#[tauri::command]
pub async fn read_file(window: Window, path: String, session_token: Option<String>) -> Result<String, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }
    let safe_path = validate_path(&path)?;
    fs::read_to_string(&safe_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn write_file(window: Window, path: String, content: String, session_token: Option<String>) -> Result<(), String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }
    let safe_path = validate_path(&path)?;
    if let Some(parent) = safe_path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    fs::write(&safe_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub async fn open_file_dialog(window: Window, session_token: Option<String>) -> Result<Option<String>, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
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

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        use tauri_plugin_dialog::DialogExt;
        let (tx, rx) = tokio::sync::oneshot::channel();
        window.dialog().file().pick_file(move |file_path| {
            let _ = tx.send(file_path.map(|p| p.to_string()));
        });
        rx.await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn save_file_dialog(window: Window, default_name: Option<String>, session_token: Option<String>) -> Result<Option<String>, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
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

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        use tauri_plugin_dialog::DialogExt;
        let mut builder = window.dialog().file();
        if let Some(name) = default_name {
            builder = builder.set_file_name(&name);
        }
        let (tx, rx) = tokio::sync::oneshot::channel();
        builder.save_file(move |file_path| {
            let _ = tx.send(file_path.map(|p| p.to_string()));
        });
        rx.await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn get_file_name(window: Window, path: String, session_token: Option<String>) -> Result<String, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }
    let safe_path = validate_path(&path)?;
    safe_path
        .file_name()
        .and_then(|name| name.to_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid file path".to_string())
}

#[tauri::command]
pub fn detect_language_from_path(window: Window, path: String, session_token: Option<String>) -> String {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return "text".to_string();
    }
    let safe_path = match validate_path(&path) {
        Ok(p) => p,
        Err(_) => return "text".to_string(),
    };
    let extension = safe_path.extension()
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
        _ => "text",
    }
    .to_string()
}

#[tauri::command]
pub fn get_file_modified_time(window: Window, path: String, session_token: Option<String>) -> Result<u64, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }
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
pub async fn open_folder_dialog(window: Window, session_token: Option<String>) -> Result<Option<String>, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use rfd::FileDialog;

        let folder_path = FileDialog::new()
            .pick_folder();

        Ok(folder_path.map(|p| p.to_string_lossy().to_string()))
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        use tauri::Manager;
        let app = window.app_handle();
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("workspace");
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create workspace directory: {}", e))?;
        Ok(Some(dir.to_string_lossy().to_string()))
    }
}

#[derive(serde::Serialize, Debug)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

pub fn read_dir_internal(dir_path: &Path, depth: usize, max_depth: usize) -> Result<Vec<FileNode>, String> {
    if depth > max_depth {
        return Ok(Vec::new());
    }

    let read_dir = match fs::read_dir(dir_path) {
        Ok(rd) => rd,
        Err(e) => {
            eprintln!("[read_dir_internal] Failed to read directory {:?}: {}", dir_path, e);
            return Err(format!("Failed to read directory: {}", e));
        }
    };

    let mut entries: Vec<FileNode> = Vec::new();

    // Skip bulky cache/build directories from deep recursion
    const IGNORED_FOLDERS: &[&str] = &[
        "node_modules", ".git", "target", "dist", "build", ".next", ".cache", ".gemini", ".idea", ".vscode"
    ];

    for entry in read_dir {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let raw_entry_path = entry.path();
        let entry_path = strip_verbatim_prefix(&raw_entry_path);
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/directories (except .env and .gitignore)
        if file_name.starts_with('.') && file_name != ".gitignore" {
            continue;
        }

        let is_dir = entry_path.is_dir();
        let children = if is_dir {
            if depth >= max_depth || IGNORED_FOLDERS.iter().any(|&f| file_name.eq_ignore_ascii_case(f)) {
                None // Will be loaded on-demand when expanded in explorer
            } else {
                match read_dir_internal(&entry_path, depth + 1, max_depth) {
                    Ok(kids) => Some(kids),
                    Err(e) => {
                        eprintln!("[read_dir_internal] Error reading subfolder {:?}: {}", entry_path, e);
                        None
                    }
                }
            }
        } else {
            None
        };

        entries.push(FileNode {
            name: file_name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            children,
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
pub fn read_directory(window: Window, path: String, session_token: Option<String>) -> Result<Vec<FileNode>, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }
    let dir_path = validate_path(&path)?;

    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    read_dir_internal(&dir_path, 0, 1)
}

#[tauri::command]
pub async fn rename_file(window: Window, old_path: String, new_path: String, session_token: Option<String>) -> Result<(), String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }
    let safe_old = validate_path(&old_path)?;
    let safe_new = validate_path(&new_path)?;
    fs::rename(&safe_old, &safe_new)
        .map_err(|e| format!("Failed to rename file: {}", e))
}

#[tauri::command]
pub async fn delete_file(
    window: Window,
    path: String,
    session_token: Option<String>,
) -> Result<(), String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin for sensitive native operation".to_string());
    }

    let safe_path = validate_path(&path)?;

    // Guard against root deletion: check parent and drive root
    if safe_path.parent().is_none() || is_system_root(&safe_path) {
        return Err("Cannot delete root directory".to_string());
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let display_path = safe_path.display().to_string();
        let confirmed = tokio::task::spawn_blocking(move || {
            rfd::MessageDialog::new()
                .set_title("Confirm Deletion")
                .set_description(&format!("Are you sure you want to permanently delete:\n\n{}", display_path))
                .set_buttons(rfd::MessageButtons::OkCancel)
                .show()
        }).await.map_err(|e| e.to_string())?;

        if confirmed != rfd::MessageDialogResult::Ok {
            return Err("User cancelled deletion".into());
        }
    }

    // Re-canonicalize immediately before removal to close TOCTOU window
    let re_validated_path = validate_path(&path)?;

    if re_validated_path.is_dir() {
        fs::remove_dir_all(&re_validated_path)
            .map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&re_validated_path)
            .map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
pub async fn open_file_explorer(
    window: Window,
    path: String,
    session_token: Option<String>,
) -> Result<(), String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin for file explorer invocation".to_string());
    }

    let safe_path = validate_path(&path)?;
    let path_str = safe_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        let mut cmd = std::process::Command::new("explorer");
        if safe_path.is_file() {
            let win_path = path_str.replace('/', "\\");
            cmd.arg(format!("/select,{}", win_path));
        } else {
            cmd.arg(&path_str);
        }
        cmd.spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        let mut cmd = std::process::Command::new("open");
        if safe_path.is_file() {
            cmd.arg("-R").arg(&path_str);
        } else {
            cmd.arg(&path_str);
        }
        cmd.spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let mut cmd = std::process::Command::new("xdg-open");
        if safe_path.is_file() {
            if let Some(parent) = safe_path.parent() {
                cmd.arg(parent);
            } else {
                cmd.arg(&path_str);
            }
        } else {
            cmd.arg(&path_str);
        }
        cmd.spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_dir_name(window: Window, path: String, session_token: Option<String>) -> Result<String, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin".into());
    }
    let safe_path = validate_path(&path)?;
    if let Some(parent) = safe_path.parent() {
        Ok(parent.to_string_lossy().into_owned())
    } else {
        Err("No parent directory found".into())
    }
}

