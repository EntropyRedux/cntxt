use std::path::Path;
use crate::commands::file::is_system_root;
use crate::app_info_payload;

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
    let forbidden_chars = ['\0', '\n', '\r', '"', '\'', '`', '$', '<', '>', '|', '&', ';'];

    let valid_url = "https://example.com/docs?query=test";
    assert!(!valid_url.chars().any(|c| forbidden_chars.contains(&c)));

    let malicious_urls = [
        "https://example.com; calc.exe",
        "https://example.com & notepad.exe",
        "https://example.com | dir",
        "https://example.com/test?a=`whoami`",
        "https://example.com/test?a=$(whoami)",
    ];

    for malicious in &malicious_urls {
        assert!(
            malicious.chars().any(|c| forbidden_chars.contains(&c)),
            "URL should have been flagged as malicious: {}",
            malicious
        );
    }
}
