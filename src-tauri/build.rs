use std::fs;
use std::path::Path;

fn watch_dir_recursive(dir: &Path) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            println!("cargo:rerun-if-changed={}", path.display());
            if path.is_dir() {
                watch_dir_recursive(&path);
            }
        }
    }
}

fn main() {
    println!("cargo:rerun-if-changed=../dist");
    watch_dir_recursive(Path::new("../dist"));
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build()
}

