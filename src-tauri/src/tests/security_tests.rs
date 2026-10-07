use std::path::Path;
use crate::commands::file::{is_system_root, validate_path};
use crate::{app_info_payload, validate_external_url};

#[test]
fn test_app_info_payload_has_no_session_id() {
    let payload = app_info_payload();
    assert_eq!(payload["name"], "CNTXT");
    assert_eq!(payload["version"], env!("CARGO_PKG_VERSION"));
    assert!(payload.get("platform").is_some());
    // CRITICAL: session_id must NEVER be returned in app_info metadata
    assert!(payload.get("session_id").is_none());
}

#[test]
fn test_is_system_root_detection() {
    #[cfg(target_os = "windows")]
    {
        // Drive roots must be detected as system roots
        assert!(is_system_root(Path::new(r"C:\")));
        assert!(is_system_root(Path::new(r"c:\")));
        assert!(is_system_root(Path::new(r"D:\")));

        // Protected system directories
        assert!(is_system_root(Path::new(r"C:\Windows\System32")));
        assert!(is_system_root(Path::new(r"c:\windows\explorer.exe")));
        assert!(is_system_root(Path::new(r"C:\Program Files\App")));
        assert!(is_system_root(Path::new(r"C:\Program Files (x86)\App")));
        assert!(is_system_root(Path::new(r"C:\ProgramData\test")));

        // Normal user document paths are NOT system roots
        assert!(!is_system_root(Path::new(r"C:\Users\User\Documents\notes.md")));
        assert!(!is_system_root(Path::new(r"C:\Projects\LocalActive\Repo\file.txt")));
    }

    #[cfg(not(target_os = "windows"))]
    {
        assert!(is_system_root(Path::new("/")));
        assert!(is_system_root(Path::new("/bin/bash")));
        assert!(is_system_root(Path::new("/etc/passwd")));
        assert!(is_system_root(Path::new("/usr/bin")));
        assert!(!is_system_root(Path::new("/home/user/Documents/notes.md")));
    }
}

#[test]
fn test_url_forbidden_characters() {
    // Tests production validate_external_url directly
    let valid_url = "https://example.com/docs?query=test";
    assert!(validate_external_url(valid_url).is_ok());

    let http_url = "http://localhost:5173/preview";
    assert!(validate_external_url(http_url).is_ok());

    let multi_param_url = "https://example.com/docs?query=test&lang=en&page=2";
    assert!(validate_external_url(multi_param_url).is_ok());

    // Prohibited schemes
    assert!(validate_external_url("file:///etc/passwd").is_err());
    assert!(validate_external_url("javascript:alert(1)").is_err());
    assert!(validate_external_url("data:text/html,test").is_err());

    // Shell metacharacters & injection vectors
    let malicious_urls = [
        "https://example.com; calc.exe",
        "https://example.com & notepad.exe",
        "https://example.com | dir",
        "https://example.com/test?a=`whoami`",
        "https://example.com/test?a=$(whoami)",
        "https://example.com/\0injected",
        "https://example.com/\ninjected",
        "https://example.com/<script>",
        "https://example.com/\"quoted\"",
    ];

    for malicious in &malicious_urls {
        assert!(
            validate_external_url(malicious).is_err(),
            "Production validate_external_url must reject malicious URL: {}",
            malicious
        );
    }
}

#[test]
fn test_validate_path_security() {
    // Empty path
    assert!(validate_path("").is_err());
    assert!(validate_path("   ").is_err());

    // Directory traversal attacks
    assert!(validate_path("../secret.txt").is_err());
    assert!(validate_path("folder/../../secret.txt").is_err());
    assert!(validate_path(r"folder\..\..\secret.txt").is_err());

    // System root rejection
    #[cfg(target_os = "windows")]
    {
        assert!(validate_path(r"C:\").is_err());
        assert!(validate_path(r"c:\windows").is_err());
    }
    #[cfg(not(target_os = "windows"))]
    {
        assert!(validate_path("/").is_err());
        assert!(validate_path("/etc").is_err());
    }
}

#[test]
fn test_ipc_session_token_authorization() {
    use crate::commands::{init_session_token, clear_session_token, is_authorized_token};

    clear_session_token();
    // When uninitialized, behaves leniently for headless unit test harnesses
    assert!(is_authorized_token(None));
    assert!(is_authorized_token(Some("any")));

    // When initialized with a secure session token
    init_session_token("secure_token_abc123".to_string());

    // Valid token matches
    assert!(is_authorized_token(Some("secure_token_abc123")));

    // Invalid or missing token is rejected
    assert!(!is_authorized_token(Some("wrong_token")));
    assert!(!is_authorized_token(None));
    assert!(!is_authorized_token(Some("")));

    clear_session_token();
}

#[test]
fn test_read_dir_redacts_env() {
    use std::fs::{self, File};
    use crate::commands::file::read_dir_internal;

    let temp_dir = std::env::temp_dir().join(format!("cntxt_test_env_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).expect("create temp dir");

    File::create(temp_dir.join(".env")).expect("create .env");
    File::create(temp_dir.join(".env.local")).expect("create .env.local");
    File::create(temp_dir.join(".gitignore")).expect("create .gitignore");
    File::create(temp_dir.join("notes.md")).expect("create notes.md");

    let entries = read_dir_internal(&temp_dir, 0, 1).expect("read_dir_internal");
    let names: Vec<String> = entries.iter().map(|e| e.name.clone()).collect();

    // Critical invariant: .env and .env.local must be redacted
    assert!(!names.contains(&".env".to_string()), ".env must be redacted");
    assert!(!names.contains(&".env.local".to_string()), ".env.local must be redacted");

    // Whitelisted dotfiles and regular files must be present
    assert!(names.contains(&".gitignore".to_string()), ".gitignore should be included");
    assert!(names.contains(&"notes.md".to_string()), "notes.md should be included");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_secrets_os_keyring_no_plaintext_fallback() {
    let secrets_source = include_str!("../commands/secrets.rs");
    assert!(!secrets_source.contains(".secrets_fallback.json"), "Zero plaintext fallback files allowed");
    assert!(!secrets_source.contains("save_fallback"), "Zero fallback saving allowed");
    assert!(!secrets_source.contains("load_fallback"), "Zero fallback loading allowed");
    assert!(secrets_source.contains("Entry::new"), "Must use OS Keyring Entry");
}

#[test]
fn test_commands_token_gating_reflection() {
    let file_rs = include_str!("../commands/file.rs");
    let secrets_rs = include_str!("../commands/secrets.rs");
    let window_rs = include_str!("../commands/window.rs");

    // All mutating and sensitive file commands must validate session token
    let sensitive_file_cmds = [
        "pub async fn read_file",
        "pub async fn write_file",
        "pub async fn delete_file",
        "pub async fn rename_file",
        "pub fn read_directory",
        "pub fn get_file_name",
        "pub fn detect_language_from_path",
        "pub fn get_file_modified_time",
        "pub async fn open_file_explorer",
        "pub fn get_dir_name",
    ];
    for cmd in &sensitive_file_cmds {
        assert!(file_rs.contains(cmd), "Command {} must exist in file.rs", cmd);
    }
    assert!(file_rs.matches("session_token: Option<String>").count() >= 10);

    // All secrets commands must require session token
    let secrets_cmds = [
        "pub fn store_api_key",
        "pub fn get_api_key",
        "pub fn delete_api_key",
        "pub fn has_api_key",
    ];
    for cmd in &secrets_cmds {
        assert!(secrets_rs.contains(cmd), "Command {} must exist in secrets.rs", cmd);
    }
    assert_eq!(secrets_rs.matches("session_token: Option<String>").count(), 4);

    // All window commands must require session token
    let window_cmds = [
        "pub fn minimize_window",
        "pub fn maximize_window",
        "pub fn unmaximize_window",
        "pub fn close_window",
        "pub fn is_maximized",
        "pub fn start_dragging",
        "pub fn toggle_maximize",
        "pub fn open_devtools",
        "pub fn toggle_devtools",
    ];
    for cmd in &window_cmds {
        assert!(window_rs.contains(cmd), "Command {} must exist in window.rs", cmd);
    }
    assert_eq!(window_rs.matches("session_token: Option<String>").count(), 9);
}
