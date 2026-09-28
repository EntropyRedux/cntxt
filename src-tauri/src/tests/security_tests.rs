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
