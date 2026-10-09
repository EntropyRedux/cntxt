use tauri::Window;

#[tauri::command]
pub fn minimize_window(window: Window, session_token: Option<String>) {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return;
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = window.minimize();
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn maximize_window(window: Window, session_token: Option<String>) {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return;
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = window.maximize();
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn unmaximize_window(window: Window, session_token: Option<String>) {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return;
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = window.unmaximize();
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn close_window(window: Window, session_token: Option<String>) {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return;
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = window.close();
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn is_maximized(window: Window, session_token: Option<String>) -> bool {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return false;
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        window.is_maximized().unwrap_or(false)
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
        true
    }
}

#[tauri::command]
pub fn start_dragging(window: Window, session_token: Option<String>) {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return;
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = window.start_dragging();
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn toggle_maximize(window: Window, session_token: Option<String>) {
    if !super::is_authorized_request(&window, session_token.as_deref()) {
        return;
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if window.is_maximized().unwrap_or(false) {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn open_devtools(window: tauri::WebviewWindow, session_token: Option<String>) {
    let raw_win = window.as_ref().window();
    if !super::is_authorized_request(&raw_win, session_token.as_deref()) {
        return;
    }
    #[cfg(any(debug_assertions, feature = "devtools"))]
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        window.open_devtools();
    }
    #[cfg(not(all(any(debug_assertions, feature = "devtools"), not(any(target_os = "android", target_os = "ios")))))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn toggle_devtools(window: tauri::WebviewWindow, session_token: Option<String>) {
    let raw_win = window.as_ref().window();
    if !super::is_authorized_request(&raw_win, session_token.as_deref()) {
        return;
    }
    #[cfg(any(debug_assertions, feature = "devtools"))]
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if window.is_devtools_open() {
            window.close_devtools();
        } else {
            window.open_devtools();
        }
    }
    #[cfg(not(all(any(debug_assertions, feature = "devtools"), not(any(target_os = "android", target_os = "ios")))))]
    {
        let _ = window;
    }
}
