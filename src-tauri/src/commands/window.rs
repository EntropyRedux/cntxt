use tauri::Window;

#[tauri::command]
pub fn minimize_window(window: Window) {
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
pub fn maximize_window(window: Window) {
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
pub fn unmaximize_window(window: Window) {
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
pub fn close_window(window: Window) {
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
pub fn is_maximized(window: Window) -> bool {
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
pub fn start_dragging(window: Window) {
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
pub fn toggle_maximize(window: Window) {
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
pub fn open_devtools(window: tauri::WebviewWindow) {
    #[cfg(debug_assertions)]
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if super::is_authorized_label(window.label()) {
            window.open_devtools();
        }
    }
    #[cfg(not(all(debug_assertions, not(any(target_os = "android", target_os = "ios")))))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn toggle_devtools(window: tauri::WebviewWindow) {
    #[cfg(debug_assertions)]
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if super::is_authorized_label(window.label()) {
            if window.is_devtools_open() {
                window.close_devtools();
            } else {
                window.open_devtools();
            }
        }
    }
    #[cfg(not(all(debug_assertions, not(any(target_os = "android", target_os = "ios")))))]
    {
        let _ = window;
    }
}


