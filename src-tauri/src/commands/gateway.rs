use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};
use tauri::Emitter;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{oneshot, RwLock};
use uuid::Uuid;

use crate::commands;

static GATEWAY_RUNNING: AtomicBool = AtomicBool::new(false);
static GATEWAY_PORT: AtomicU16 = AtomicU16::new(0);
static GATEWAY_TOKEN: std::sync::RwLock<Option<String>> = std::sync::RwLock::new(None);
static SHUTDOWN_TX: std::sync::RwLock<Option<tokio::sync::broadcast::Sender<()>>> =
    std::sync::RwLock::new(None);

type RpcSender = oneshot::Sender<Value>;
type RpcMap = Arc<RwLock<HashMap<String, RpcSender>>>;

fn get_pending_map() -> &'static RpcMap {
    static MAP: std::sync::OnceLock<RpcMap> = std::sync::OnceLock::new();
    MAP.get_or_init(|| Arc::new(RwLock::new(HashMap::new())))
}

const GATEWAY_KEYRING_SERVICE: &str = "CNTXT";
const GATEWAY_KEYRING_KEY: &str = "rest_gateway_token";

fn load_persisted_gateway_token() -> Option<String> {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if let Ok(entry) = keyring::Entry::new(GATEWAY_KEYRING_SERVICE, GATEWAY_KEYRING_KEY) {
            if let Ok(token) = entry.get_password() {
                if token.starts_with("cntxt_sec_") && token.len() == 42 {
                    return Some(token);
                }
            }
        }
    }
    None
}

fn persist_gateway_token(token: &str) {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if let Ok(entry) = keyring::Entry::new(GATEWAY_KEYRING_SERVICE, GATEWAY_KEYRING_KEY) {
            let _ = entry.set_password(token);
        }
    }
    sync_gateway_discovery_file(GATEWAY_PORT.load(Ordering::SeqCst), token);
}

fn sync_gateway_discovery_file(port: u16, token: &str) {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let effective_port = if port > 0 { port } else { 9876 };
        let payload = json!({
            "url": format!("http://127.0.0.1:{}", effective_port),
            "token": token
        });
        let discovery_path = std::path::Path::new("C:/Projects/LocalActive/.localactive/cntxt_gateway.json");
        if let Some(parent) = discovery_path.parent() {
            if parent.exists() {
                if let Ok(pretty) = serde_json::to_string_pretty(&payload) {
                    let _ = std::fs::write(discovery_path, pretty);
                }
            }
        }
    }
}

pub fn current_gateway_token() -> Option<String> {
    GATEWAY_TOKEN.read().ok().and_then(|lock| lock.clone())
}

pub fn init_gateway_token_if_empty() -> String {
    if let Ok(read_lock) = GATEWAY_TOKEN.read() {
        if let Some(ref t) = *read_lock {
            return t.clone();
        }
    }
    let token = load_persisted_gateway_token().unwrap_or_else(|| {
        let generated = format!("cntxt_sec_{}", Uuid::new_v4().to_string().replace('-', ""));
        persist_gateway_token(&generated);
        generated
    });
    if let Ok(mut write_lock) = GATEWAY_TOKEN.write() {
        *write_lock = Some(token.clone());
    }
    token
}

pub fn is_valid_gateway_token(provided: Option<&str>) -> bool {
    let expected = current_gateway_token();
    match (expected, provided) {
        (Some(exp), Some(prov)) => {
            // Constant-time check
            if exp.len() != prov.len() {
                return false;
            }
            exp.as_bytes()
                .iter()
                .zip(prov.as_bytes().iter())
                .fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0
        }
        _ => false,
    }
}

pub fn is_valid_host_header(host: Option<&str>) -> bool {
    match host {
        Some(h) => {
            let trimmed = h.trim();
            let hostname = if trimmed.starts_with('[') {
                if let Some(end_bracket) = trimmed.find(']') {
                    &trimmed[1..end_bracket]
                } else {
                    trimmed
                }
            } else {
                trimmed.split(':').next().unwrap_or("").trim()
            };
            let lower = hostname.to_lowercase();
            lower == "127.0.0.1" || lower == "localhost" || lower == "::1"
        }
        None => false,
    }
}

pub fn resolve_cors_headers(origin: Option<&str>) -> String {
    match origin {
        Some(o) => {
            let lower = o.trim().to_lowercase();
            if lower == "tauri://localhost"
                || lower.starts_with("http://127.0.0.1")
                || lower.starts_with("http://localhost")
                || lower.starts_with("https://localhost")
            {
                format!(
                    "Access-Control-Allow-Origin: {}\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, X-CNTXT-Token\r\nVary: Origin\r\n",
                    o.trim()
                )
            } else {
                "Access-Control-Allow-Origin: null\r\n".to_string()
            }
        }
        None => String::new(),
    }
}

#[tauri::command]
pub async fn start_rest_gateway(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    port: Option<u16>,
    session_token: Option<String>,
) -> Result<u16, String> {
    if !commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin for REST gateway management".into());
    }

    if GATEWAY_RUNNING.load(Ordering::SeqCst) {
        return Ok(GATEWAY_PORT.load(Ordering::SeqCst));
    }

    let _ = init_gateway_token_if_empty();
    let requested_port = port.unwrap_or(9876);

    // Try requested port and fallback up to next 5 ports per FIND-12
    let mut bound_listener = None;
    for candidate in requested_port..=(requested_port.saturating_add(5)) {
        if let Ok(l) = TcpListener::bind(format!("127.0.0.1:{}", candidate)).await {
            bound_listener = Some(l);
            break;
        }
    }

    let listener = match bound_listener {
        Some(l) => l,
        None => TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Failed to bind loopback TCP listener on any candidate port: {}", e))?,
    };

    let bound_addr = listener
        .local_addr()
        .map_err(|e| format!("Failed to read bound port: {}", e))?;
    let bound_port = bound_addr.port();

    GATEWAY_PORT.store(bound_port, Ordering::SeqCst);
    GATEWAY_RUNNING.store(true, Ordering::SeqCst);
    if let Some(tok) = current_gateway_token() {
        sync_gateway_discovery_file(bound_port, &tok);
    }

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::broadcast::channel::<()>(1);
    if let Ok(mut lock) = SHUTDOWN_TX.write() {
        *lock = Some(shutdown_tx);
    }

    let app = app_handle.clone();
    let pending_map = get_pending_map().clone();

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    break;
                }
                accept_res = listener.accept() => {
                    match accept_res {
                        Ok((stream, addr)) => {
                            if !addr.ip().is_loopback() {
                                continue;
                            }
                            let app_clone = app.clone();
                            let map_clone = pending_map.clone();
                            tokio::spawn(async move {
                                handle_http_client(stream, addr, app_clone, map_clone).await;
                            });
                        }
                        Err(_) => {
                            if !GATEWAY_RUNNING.load(Ordering::SeqCst) {
                                break;
                            }
                        }
                    }
                }
            }
        }
    });

    Ok(bound_port)
}

#[tauri::command]
pub async fn stop_rest_gateway(
    window: tauri::Window,
    session_token: Option<String>,
) -> Result<(), String> {
    if !commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin for REST gateway management".into());
    }

    GATEWAY_RUNNING.store(false, Ordering::SeqCst);
    GATEWAY_PORT.store(0, Ordering::SeqCst);

    if let Ok(lock) = SHUTDOWN_TX.read() {
        if let Some(ref tx) = *lock {
            let _ = tx.send(());
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_gateway_status(
    window: tauri::Window,
    session_token: Option<String>,
) -> Result<Value, String> {
    if !commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin for REST gateway management".into());
    }

    let is_running = GATEWAY_RUNNING.load(Ordering::SeqCst);
    let port = GATEWAY_PORT.load(Ordering::SeqCst);
    let token = init_gateway_token_if_empty();

    Ok(json!({
        "running": is_running,
        "port": port,
        "authToken": token,
    }))
}

#[tauri::command]
pub async fn regenerate_gateway_token(
    window: tauri::Window,
    session_token: Option<String>,
) -> Result<String, String> {
    if !commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin for REST gateway management".into());
    }

    let new_token = format!("cntxt_sec_{}", Uuid::new_v4().to_string().replace('-', ""));
    persist_gateway_token(&new_token);
    if let Ok(mut write_lock) = GATEWAY_TOKEN.write() {
        *write_lock = Some(new_token.clone());
    }

    Ok(new_token)
}

#[tauri::command]
pub async fn resolve_rpc_response(
    window: tauri::Window,
    correlation_id: String,
    response: Value,
    session_token: Option<String>,
) -> Result<(), String> {
    if !commands::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin for RPC resolution".into());
    }

    let pending_map = get_pending_map();
    let sender_opt = {
        let mut map_lock = pending_map.write().await;
        map_lock.remove(&correlation_id)
    };

    if let Some(sender) = sender_opt {
        let _ = sender.send(response);
    }

    Ok(())
}

async fn handle_http_client(
    mut stream: TcpStream,
    _addr: SocketAddr,
    app: tauri::AppHandle,
    pending_map: RpcMap,
) {
    let mut header_buf = Vec::new();
    let mut stream_buf = [0u8; 8192];
    let mut body_start_idx = None;

    // 1. Read until headers end (\r\n\r\n or \n\n) - FIND-08 multi-segment header parsing
    while header_buf.len() < 65536 {
        let n = match stream.read(&mut stream_buf).await {
            Ok(bytes) if bytes > 0 => bytes,
            _ => return,
        };
        header_buf.extend_from_slice(&stream_buf[..n]);

        if let Some(pos) = header_buf.windows(4).position(|w| w == b"\r\n\r\n") {
            body_start_idx = Some(pos + 4);
            break;
        } else if let Some(pos) = header_buf.windows(2).position(|w| w == b"\n\n") {
            body_start_idx = Some(pos + 2);
            break;
        }
    }

    let body_start = match body_start_idx {
        Some(idx) => idx,
        None => return, // Headers exceed 64KB or connection closed
    };

    let header_str = String::from_utf8_lossy(&header_buf[..body_start]);
    let mut lines = header_str.lines();
    let request_line = match lines.next() {
        Some(l) => l,
        None => return,
    };

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }

    let method = parts[0];
    let path = parts[1];

    let mut headers = HashMap::new();
    for line in lines {
        if line.is_empty() || line == "\r" {
            break;
        }
        if let Some((k, v)) = line.split_once(':') {
            headers.insert(k.trim().to_lowercase(), v.trim().to_string());
        }
    }

    // Resolve CORS headers per FIND-09
    let cors_headers = resolve_cors_headers(headers.get("origin").map(|s| s.as_str()));

    // Handle CORS preflight OPTIONS
    if method == "OPTIONS" {
        let cors_resp = format!(
            "HTTP/1.1 204 No Content\r\n\
{}Connection: close\r\n\r\n",
            cors_headers
        );
        let _ = stream.write_all(cors_resp.as_bytes()).await;
        return;
    }

    // Host header validation (DNS rebinding guard per FIND-09)
    let host_hdr = headers.get("host").map(|s| s.as_str());
    if !is_valid_host_header(host_hdr) {
        let err_body = json!({
            "success": false,
            "error": {
                "code": "FORBIDDEN",
                "message": "Forbidden: invalid Host header for loopback REST gateway"
            }
        })
        .to_string();
        let resp = format!(
            "HTTP/1.1 403 Forbidden\r\n\
Content-Type: application/json; charset=utf-8\r\n\
{}Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
            cors_headers,
            err_body.len(),
            err_body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    // Health Check (Minimal liveness only per FIND-PLAN-20-01)
    if method == "GET" && path == "/api/v1/health" {
        let body = json!({
            "status": "ok",
            "version": env!("CARGO_PKG_VERSION")
        })
        .to_string();
        let resp = format!(
            "HTTP/1.1 200 OK\r\n\
Content-Type: application/json; charset=utf-8\r\n\
{}Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
            cors_headers,
            body.len(),
            body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    // Validate X-CNTXT-Token using constant-time verification
    let provided_token = headers.get("x-cntxt-token").map(|s| s.as_str());
    let token_valid = is_valid_gateway_token(provided_token);

    if !token_valid {
        let err_body = json!({
            "success": false,
            "error": {
                "code": "UNAUTHORIZED",
                "message": "Missing or invalid X-CNTXT-Token header"
            }
        })
        .to_string();
        let resp = format!(
            "HTTP/1.1 401 Unauthorized\r\n\
Content-Type: application/json; charset=utf-8\r\n\
{}Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
            cors_headers,
            err_body.len(),
            err_body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    // Read full body according to Content-Length (FIND-08)
    let content_length: usize = headers
        .get("content-length")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);

    // Limit maximum request body to 10MB
    if content_length > 10 * 1024 * 1024 {
        let err_body = json!({
            "success": false,
            "error": {
                "code": "PAYLOAD_TOO_LARGE",
                "message": "Payload Too Large: maximum allowed body is 10MB"
            }
        })
        .to_string();
        let resp = format!(
            "HTTP/1.1 413 Payload Too Large\r\n\
Content-Type: application/json; charset=utf-8\r\n\
{}Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
            cors_headers,
            err_body.len(),
            err_body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    let mut body_bytes = header_buf[body_start..].to_vec();
    while body_bytes.len() < content_length {
        let to_read = (content_length - body_bytes.len()).min(8192);
        let n = match stream.read(&mut stream_buf[..to_read]).await {
            Ok(bytes) if bytes > 0 => bytes,
            _ => break,
        };
        body_bytes.extend_from_slice(&stream_buf[..n]);
    }

    let body_text = String::from_utf8_lossy(&body_bytes);

    // Construct CntxtRpcRequest
    let correlation_id = Uuid::new_v4().to_string();
    let (rpc_request, parse_ok) = match (method, path) {
        ("GET", "/api/v1/workspace") => (
            json!({
                "id": correlation_id,
                "domain": "workspace",
                "action": "getInfo",
                "appId": "rest_gateway",
                "payload": {}
            }),
            true,
        ),
        ("POST", "/api/v1/rpc") => match serde_json::from_str::<Value>(&body_text) {
            Ok(mut val) => {
                if let Some(obj) = val.as_object_mut() {
                    obj.insert("id".to_string(), json!(correlation_id.clone()));
                    obj.insert("appId".to_string(), json!("rest_gateway"));
                }
                (val, true)
            }
            Err(_) => (Value::Null, false),
        },
        ("POST", "/api/v1/editor/insert") => match serde_json::from_str::<Value>(&body_text) {
            Ok(val) => (
                json!({
                    "id": correlation_id,
                    "domain": "editor",
                    "action": "insert",
                    "appId": "rest_gateway",
                    "payload": val
                }),
                true,
            ),
            Err(_) => (Value::Null, false),
        },
        ("POST", "/api/v1/tabs/open") => match serde_json::from_str::<Value>(&body_text) {
            Ok(val) => (
                json!({
                    "id": correlation_id,
                    "domain": "tabs",
                    "action": "create",
                    "appId": "rest_gateway",
                    "payload": val
                }),
                true,
            ),
            Err(_) => (Value::Null, false),
        },
        _ => (Value::Null, false),
    };

    if !parse_ok {
        let err_body = json!({
            "success": false,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Invalid JSON payload or endpoint not found"
            }
        })
        .to_string();
        let resp = format!(
            "HTTP/1.1 400 Bad Request\r\n\
Content-Type: application/json; charset=utf-8\r\n\
{}Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
            cors_headers,
            err_body.len(),
            err_body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    // Register correlation channel and forward to frontend
    let (tx, rx) = oneshot::channel();
    {
        let mut map_lock = pending_map.write().await;
        map_lock.insert(correlation_id.clone(), tx);
    }

    let emit_payload = json!({
        "correlationId": correlation_id.clone(),
        "request": rpc_request
    });

    let _ = app.emit("cntxt://rpc-request", emit_payload);

    // Await response with 15-second timeout (per FIND-PLAN-20-02)
    let response_result = tokio::time::timeout(Duration::from_secs(15), rx).await;

    let (status_code, status_text, response_json) = match response_result {
        Ok(Ok(val)) => ("200", "OK", val.to_string()),
        Ok(Err(_)) => (
            "500",
            "Internal Server Error",
            json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "RPC response channel closed unexpectedly"
                }
            })
            .to_string(),
        ),
        Err(_) => {
            // Timeout cleanup
            let mut map_lock = pending_map.write().await;
            map_lock.remove(&correlation_id);
            (
                "504",
                "Gateway Timeout",
                json!({
                    "success": false,
                    "error": {
                        "code": "TIMEOUT",
                        "message": "Webview execution timed out after 15 seconds"
                    }
                })
                .to_string(),
            )
        }
    };

    let http_response = format!(
        "HTTP/1.1 {} {}\r\n\
Content-Type: application/json; charset=utf-8\r\n\
{}Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
        status_code,
        status_text,
        cors_headers,
        response_json.len(),
        response_json
    );

    let _ = stream.write_all(http_response.as_bytes()).await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_and_validate_gateway_token() {
        let token = init_gateway_token_if_empty();
        assert!(token.starts_with("cntxt_sec_"));
        assert_eq!(token.len(), 42); // "cntxt_sec_" (10) + 32 hex chars

        // Valid token
        assert!(is_valid_gateway_token(Some(&token)));

        // Invalid tokens
        assert!(!is_valid_gateway_token(Some("wrong_token")));
        assert!(!is_valid_gateway_token(Some("")));
        assert!(!is_valid_gateway_token(None));

        // Tampered token of equal length
        let mut tampered = token.clone();
        tampered.replace_range(15..16, "z");
        assert!(!is_valid_gateway_token(Some(&tampered)));
    }

    #[test]
    fn test_is_valid_host_header() {
        assert!(is_valid_host_header(Some("127.0.0.1:9876")));
        assert!(is_valid_host_header(Some("localhost:9876")));
        assert!(is_valid_host_header(Some("localhost")));
        assert!(is_valid_host_header(Some("127.0.0.1")));
        assert!(is_valid_host_header(Some("[::1]:9876")));

        // Rejection of external hostnames (DNS rebinding guards)
        assert!(!is_valid_host_header(Some("evil.com")));
        assert!(!is_valid_host_header(Some("attacker.local:9876")));
        assert!(!is_valid_host_header(Some("")));
        assert!(!is_valid_host_header(None));
    }

    #[test]
    fn test_resolve_cors_headers() {
        let local_res = resolve_cors_headers(Some("http://127.0.0.1:3000"));
        assert!(local_res.contains("Access-Control-Allow-Origin: http://127.0.0.1:3000"));
        assert!(local_res.contains("Vary: Origin"));

        let tauri_res = resolve_cors_headers(Some("tauri://localhost"));
        assert!(tauri_res.contains("Access-Control-Allow-Origin: tauri://localhost"));

        let external_res = resolve_cors_headers(Some("https://malicious-site.com"));
        assert!(external_res.contains("Access-Control-Allow-Origin: null"));

        let none_res = resolve_cors_headers(None);
        assert!(none_res.is_empty());
    }
}
