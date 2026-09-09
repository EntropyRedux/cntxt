use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::{header, HeaderValue},
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use std::sync::{Arc, RwLock};
use tokio::sync::broadcast;
use tower_http::set_header::SetResponseHeaderLayer;

/// Strict CSP for the preview document. The preview runner is served as an
/// external file (/preview.js) so inline scripts are never required. Remote
/// images and connections are not allowed from a sanitized document.
const PREVIEW_CSP: &str = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://localhost:* ws://127.0.0.1:*; object-src 'none'; base-uri 'none'; form-action 'none'";

struct AppState {
    content: RwLock<String>,
    settings: RwLock<Option<String>>,
    tx: broadcast::Sender<String>,
}

pub struct PreviewServer {
    port: u16,
    state: Arc<AppState>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl PreviewServer {
    pub fn new() -> Self {
        let (tx, _rx) = broadcast::channel(100);
        Self {
            port: 3000,
            state: Arc::new(AppState {
                content: RwLock::new(String::from("<h1>Waiting for content...</h1>")),
                settings: RwLock::new(None),
                tx,
            }),
            shutdown_tx: None,
        }
    }

    pub async fn start(&mut self) -> Result<u16, String> {
        if self.shutdown_tx.is_some() {
            return Ok(self.port);
        }

        let state = self.state.clone();

        let app = Router::new()
            .route("/", get(index_handler))
            .route("/preview.js", get(script_handler))
            .route("/ws", get(ws_handler))
            .layer(SetResponseHeaderLayer::overriding(
                header::CONTENT_SECURITY_POLICY,
                HeaderValue::from_static(PREVIEW_CSP),
            ))
            .with_state(state);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| e.to_string())?;

        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        self.port = port;

        let (tx, rx) = tokio::sync::oneshot::channel();
        self.shutdown_tx = Some(tx);

        tokio::spawn(async move {
            if let Err(e) = axum::serve(listener, app)
                .with_graceful_shutdown(async { let _ = rx.await; })
                .await
            {
                eprintln!("Preview server error: {e}");
            }
        });

        Ok(port)
    }

    pub fn update_content(&self, html: String) {
        if let Ok(mut content) = self.state.content.write() {
            *content = html.clone();
        }
        let payload = serde_json::json!({ "type": "content", "value": html });
        let _ = self.state.tx.send(payload.to_string());
    }

    pub fn update_settings(&self, json: String) {
        if let Ok(mut settings) = self.state.settings.write() {
            *settings = Some(json.clone());
        }
        let payload = format!(r#"{{"type":"settings","value":{}}}"#, json);
        let _ = self.state.tx.send(payload);
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

async fn index_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let content = state.content.read().unwrap().clone();
    Html(content)
}

async fn script_handler() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "application/javascript; charset=utf-8")],
        PREVIEW_JS_BODY,
    )
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.tx.subscribe();

    // Send current state on connect so late joiners render the latest view
    // without waiting for the next content/settings push.
    let pending_settings = state
        .settings
        .read()
        .ok()
        .and_then(|guard| guard.clone());
    if let Some(json) = pending_settings {
        let payload = format!(r#"{{"type":"settings","value":{}}}"#, json);
        if socket.send(Message::Text(payload)).await.is_err() {
            return;
        }
    }
    let content = state.content.read().unwrap().clone();
    let payload = serde_json::json!({ "type": "content", "value": content });
    if socket.send(Message::Text(payload.to_string())).await.is_err() {
        return;
    }

    while let Ok(msg) = rx.recv().await {
        if socket.send(Message::Text(msg)).await.is_err() {
            break;
        }
    }
}
const PREVIEW_JS_BODY: &str = r#"(function () {
  'use strict';

  var reconnectAttempts = 0;
  var maxReconnectAttempts = 10;
  var baseReconnectDelay = 1000;
  var ws = null;
  var previewObserver = null;

  // Local-only renderer hooks. Syntax highlighting / Mermaid / MathJax CDN
  // loading has been removed for security; these are safe no-ops.
  window.PreviewLibs = {
    hljs: false,
    mathjax: false,
    mermaid: false,
    tailwind: false,
    highlight: function () {},
    renderMermaid: async function () {},
    renderAll: async function (_contentElement) {}
  };

  window.updatePreviewSettings = function (settings) {
    if (!settings) return;
    if (settings.previewFontScale) {
      document.body.style.fontSize = (16 * settings.previewFontScale) + 'px';
    }
    if (settings.previewMaxWidth) {
      var layout = document.getElementById('layout');
      if (layout) layout.style.maxWidth = settings.previewMaxWidth;
    }
    if (settings.previewContentMargin) {
      var body = document.querySelector('.markdown-body');
      if (body) {
        body.style.paddingLeft = settings.previewContentMargin;
        body.style.paddingRight = settings.previewContentMargin;
      }
    }
    if (settings.previewCustomCSS !== undefined) {
      var customCss = document.getElementById('contextpad-custom-css');
      if (customCss) customCss.textContent = settings.previewCustomCSS;
    }
  };

  function updateStatus(message, isError) {
    var status = document.getElementById('lib-status');
    if (status) {
      status.textContent = message;
      status.style.color = isError ? '#ef4444' : '#9d9d9d';
    }
  }

  function initPreview() {
    var toggleBtn = document.getElementById('toc-toggle');
    var layout = document.getElementById('layout');
    if (toggleBtn && layout) {
      toggleBtn.onclick = function () {
        layout.classList.toggle('sidebar-expanded');
      };
    }

    if (previewObserver) { try { previewObserver.disconnect(); } catch (e) {} }
    previewObserver = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var id = entries[i].target.getAttribute('id');
        if (entries[i].isIntersecting && id) {
          var links = document.querySelectorAll('.toc-sidebar a');
          for (var j = 0; j < links.length; j++) {
            links[j].classList.toggle('active', links[j].getAttribute('href') === '#' + id);
          }
        }
      }
    }, { rootMargin: '-20% 0px -80% 0px' });

    var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (var k = 0; k < headings.length; k++) {
      if (headings[k].id) previewObserver.observe(headings[k]);
    }
  }

  function connect() {
    var wsUrl = 'ws://' + window.location.host + '/ws';
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      scheduleReconnect();
      return;
    }

    ws.onopen = function () {
      reconnectAttempts = 0;
      updateStatus('Connected', false);
    };

    ws.onmessage = function (event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }

      if (msg.type === 'content') {
        var container = document.getElementById('content');
        if (container) container.innerHTML = msg.value || '';
        if (window.PreviewLibs) window.PreviewLibs.renderAll(container);
        initPreview();
        updateStatus('Updated', false);
      } else if (msg.type === 'settings') {
        window.updatePreviewSettings(msg.value);
      }
    };

    ws.onclose = function (event) {
      ws = null;
      if (event.code !== 1000) {
        updateStatus('Disconnected - Reconnecting...', true);
        scheduleReconnect();
      } else {
        updateStatus('Preview closed', false);
      }
    };

    ws.onerror = function () {
      updateStatus('Connection error', true);
    };
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      updateStatus('Connection failed - Refresh to retry', true);
      return;
    }
    reconnectAttempts++;
    var delay = baseReconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
    setTimeout(connect, delay);
  }

  // Handle Action button clicks in preview
  document.addEventListener('click', function (e) {
    var target = e.target;
    var btn = target && target.closest ? target.closest('.cm-action-button') : null;
    if (btn) {
      var actionId = btn.getAttribute('data-action-id') || 'Unknown';
      updateStatus('Action: ' + actionId, false);
    }
  });

  // Handle page visibility changes
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !ws) {
      reconnectAttempts = 0;
      connect();
    }
  });

  function boot() {
    connect();
    initPreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
"#;
