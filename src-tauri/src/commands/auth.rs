use std::time::Duration;
use tauri::Window;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

fn url_decode(s: &str) -> String {
    let mut bytes = Vec::new();
    let s_bytes = s.as_bytes();
    let mut i = 0;
    while i < s_bytes.len() {
        if s_bytes[i] == b'+' {
            bytes.push(b' ');
            i += 1;
        } else if s_bytes[i] == b'%' && i + 2 < s_bytes.len() {
            if let Ok(b) = u8::from_str_radix(std::str::from_utf8(&s_bytes[i + 1..i + 3]).unwrap_or("00"), 16) {
                bytes.push(b);
                i += 3;
            } else {
                bytes.push(s_bytes[i]);
                i += 1;
            }
        } else {
            bytes.push(s_bytes[i]);
            i += 1;
        }
    }
    String::from_utf8_lossy(&bytes).to_string()
}

fn html_escape(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

fn parse_query_params(query: &str) -> serde_json::Map<String, serde_json::Value> {
    let mut map = serde_json::Map::new();
    for param in query.split('&') {
        if param.is_empty() {
            continue;
        }
        let mut kv = param.splitn(2, '=');
        let k = kv.next().unwrap_or("");
        let v = kv.next().unwrap_or("");
        if !k.is_empty() {
            map.insert(k.to_string(), serde_json::Value::String(url_decode(v)));
        }
    }
    map
}

const EXTRACTOR_HTML: &str = r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CNTXT - Completing Sign-In...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #111827;
      border: 1px solid #1f293d;
      border-radius: 16px;
      padding: 32px 40px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #f8fafc; }
    p { font-size: 13px; color: #94a3b8; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Completing Sign-In...</h1>
    <p>Transferring authentication session to CNTXT Desktop.</p>
  </div>
  <script>
    (function() {
      var hash = window.location.hash ? window.location.hash.substring(1) : '';
      var search = window.location.search ? window.location.search.substring(1) : '';
      var query = hash || search;
      if (query) {
        window.location.replace('/auth/token?' + query);
      } else {
        document.querySelector('h1').textContent = 'Authentication Pending';
        document.querySelector('p').textContent = 'No credentials received. You may close this tab.';
        setTimeout(function() { window.close(); }, 3000);
      }
    })();
  </script>
</body>
</html>"#;

const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CNTXT - Signed In</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #111827;
      border: 1px solid #1f293d;
      border-radius: 16px;
      padding: 32px 40px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .icon {
      width: 48px;
      height: 48px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px; color: #f8fafc; }
    p { font-size: 14px; color: #94a3b8; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Signed In Successfully</h1>
    <p>You can close this tab and return to <strong>CNTXT</strong>.</p>
  </div>
  <script>
    setTimeout(function() { window.close(); }, 1200);
  </script>
</body>
</html>"#;

#[tauri::command]
pub async fn open_oauth_url(window: Window, url: String, session_token: Option<String>) -> Result<(), String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin or token".into());
    }

    let trimmed = crate::validate_external_url(&url)?;
    if !trimmed.starts_with("https://") {
        return Err("OAuth URL must use secure https:// protocol".into());
    }

    open::that_detached(trimmed).map_err(|e| format!("Failed to launch default browser: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn start_oauth_listener(window: Window, expected_state: String, session_token: Option<String>) -> Result<String, String> {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return Err("Unauthorized window origin or token".into());
    }

    if expected_state.trim().is_empty() {
        return Err("OAuth expected_state cannot be empty".into());
    }

    // Bind to port 1420 (registered in Supabase redirect URL list)
    let listener = match TcpListener::bind("127.0.0.1:1420").await {
        Ok(l) => l,
        Err(_) => {
            // Fallback attempts
            let fallbacks = [14251];
            let mut opt = None;
            for p in fallbacks {
                if let Ok(l) = TcpListener::bind(format!("127.0.0.1:{}", p)).await {
                    opt = Some(l);
                    break;
                }
            }
            opt.ok_or_else(|| "Could not bind local OAuth callback listener on port 1420".to_string())?
        }
    };

    // Wait for incoming redirect with a 180s timeout
    let timeout_duration = Duration::from_secs(180);
    let result = tokio::time::timeout(timeout_duration, async {
        let mut captured_payload: Option<String> = None;

        while captured_payload.is_none() {
            let (mut socket, _) = listener.accept().await.map_err(|e| e.to_string())?;
            let mut buffer = Vec::with_capacity(8192);
            let mut chunk = [0u8; 4096];

            let bytes_read = socket.read(&mut chunk).await.map_err(|e| e.to_string())?;
            if bytes_read == 0 {
                continue;
            }
            buffer.extend_from_slice(&chunk[..bytes_read]);

            let request_str = String::from_utf8_lossy(&buffer);
            let first_line = request_str.lines().next().unwrap_or("");
            let parts: Vec<&str> = first_line.split_whitespace().collect();
            let method = if !parts.is_empty() { parts[0] } else { "GET" };
            let uri = if parts.len() >= 2 { parts[1] } else { "/" };

            // Handle CORS OPTIONS preflight
            if method == "OPTIONS" {
                let response = "HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
                let _ = socket.write_all(response.as_bytes()).await;
                let _ = socket.flush().await;
                continue;
            }

            // Path 1: GET with query parameters (from EXTRACTOR_HTML navigation or direct OAuth redirect)
            if method == "GET" && (uri.starts_with("/auth/token?") || uri.starts_with("/auth/callback?")) {
                if let Some(query_start) = uri.find('?') {
                    let query = &uri[query_start + 1..];
                    let map = parse_query_params(query);

                    if map.contains_key("error") || map.contains_key("error_description") {
                        let err_msg = map.get("error_description")
                            .or_else(|| map.get("error"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown OAuth Error");
                        let err_html = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<!DOCTYPE html><html><body style=\"background:#090d16;color:#f87171;font-family:sans-serif;padding:40px;text-align:center;\"><h2>Authentication Failed</h2><p>{}</p></body></html>",
                            html_escape(err_msg)
                        );
                        let _ = socket.write_all(err_html.as_bytes()).await;
                        let _ = socket.flush().await;
                        return Err(format!("OAuth error: {}", err_msg));
                    }

                    // CSRF State validation
                    let received_state = map.get("state").and_then(|v| v.as_str()).unwrap_or("");
                    if expected_state.is_empty() || received_state.is_empty() || received_state != expected_state {
                        let err_html = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<!DOCTYPE html><html><body style=\"background:#090d16;color:#f87171;font-family:sans-serif;padding:40px;text-align:center;\"><h2>Authentication Failed</h2><p>Invalid OAuth state parameter (CSRF protection).</p></body></html>";
                        let _ = socket.write_all(err_html.as_bytes()).await;
                        let _ = socket.flush().await;
                        return Err("OAuth state mismatch: potential CSRF attack detected".into());
                    }

                    if map.contains_key("access_token") || map.contains_key("code") {
                        captured_payload = Some(serde_json::Value::Object(map).to_string());
                        let response = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}",
                            SUCCESS_HTML.len(),
                            SUCCESS_HTML
                        );
                        let _ = socket.write_all(response.as_bytes()).await;
                        let _ = socket.flush().await;
                        break;
                    }
                }
            }

            // Path 2: POST /auth/token (JSON or form body)
            if method == "POST" && uri.starts_with("/auth/token") {
                // Ensure complete HTTP body is read
                let mut header_end = request_str.find("\r\n\r\n");
                let mut content_length = 0usize;

                for line in request_str.lines() {
                    let lower = line.to_lowercase();
                    if lower.starts_with("content-length:") {
                        if let Some(val) = line.split(':').nth(1) {
                            content_length = val.trim().parse::<usize>().unwrap_or(0);
                        }
                    }
                }

                while header_end.is_none() || buffer.len() < header_end.unwrap() + 4 + content_length {
                    let bytes = socket.read(&mut chunk).await.map_err(|e| e.to_string())?;
                    if bytes == 0 {
                        break;
                    }
                    buffer.extend_from_slice(&chunk[..bytes]);
                    let updated_req = String::from_utf8_lossy(&buffer);
                    header_end = updated_req.find("\r\n\r\n");
                }

                let final_req = String::from_utf8_lossy(&buffer);
                if let Some(body_start) = final_req.find("\r\n\r\n") {
                    let body = &final_req[body_start + 4..];
                    let trimmed_body = body.trim();
                    if !trimmed_body.is_empty() {
                        let parsed_val = if trimmed_body.starts_with('{') {
                            serde_json::from_str::<serde_json::Value>(trimmed_body).ok()
                        } else {
                            let map = parse_query_params(trimmed_body);
                            Some(serde_json::Value::Object(map))
                        };

                        if let Some(val) = parsed_val {
                            // CSRF State validation on POST path
                            let received_state = val.get("state").and_then(|v| v.as_str()).unwrap_or("");
                            if expected_state.is_empty() || received_state.is_empty() || received_state != expected_state {
                                let err_json = "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: 48\r\n\r\n{\"error\":\"Invalid OAuth state parameter (CSRF)\"}";
                                let _ = socket.write_all(err_json.as_bytes()).await;
                                let _ = socket.flush().await;
                                return Err("OAuth state mismatch on POST /auth/token: potential CSRF attack detected".into());
                            }
                            captured_payload = Some(val.to_string());
                        }
                    }
                }

                let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: 15\r\n\r\n{\"status\":\"ok\"}";
                let _ = socket.write_all(response.as_bytes()).await;
                let _ = socket.flush().await;
                if captured_payload.is_some() {
                    break;
                }
                continue;
            }

            // Path 3: GET /auth/callback without query params (serves EXTRACTOR_HTML to grab hash fragment)
            if method == "GET" && (uri == "/auth/callback" || uri == "/auth/callback/") {
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}",
                    EXTRACTOR_HTML.len(),
                    EXTRACTOR_HTML
                );
                let _ = socket.write_all(response.as_bytes()).await;
                let _ = socket.flush().await;
            } else {
                let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                let _ = socket.write_all(response.as_bytes()).await;
                let _ = socket.flush().await;
            }
        }

        captured_payload.ok_or_else(|| "No authorization tokens captured from redirect".to_string())
    }).await;

    match result {
        Ok(inner_res) => inner_res,
        Err(_) => Err("Authentication timed out after 3 minutes".into()),
    }
}
