use std::sync::{Arc, Mutex};
use tauri::Window;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_video_file(window: Window) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let result = Arc::new(Mutex::new(None));
    let result_clone = result.clone();

    window
        .dialog()
        .file()
        .add_filter("Video Files", &["mp4", "mov", "avi", "mkv"])
        .pick_file(move |path| {
            *result_clone.lock().unwrap() = path.map(|p| p.to_string());
        });

    Arc::try_unwrap(result).ok()?.into_inner().ok()?
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, open_video_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}