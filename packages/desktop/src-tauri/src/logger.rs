use chrono::Local;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

static LOG_FILE: Mutex<Option<File>> = Mutex::new(None);
static LOG_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

/// Get a fallback log directory that should always work
fn get_fallback_log_dir() -> PathBuf {
    // Try multiple fallback locations
    if let Ok(home) = std::env::var("USERPROFILE") {
        return PathBuf::from(home).join(".journal-todo");
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".journal-todo");
    }
    if let Ok(temp) = std::env::var("TEMP") {
        return PathBuf::from(temp).join("journal-todo");
    }
    if let Ok(tmp) = std::env::var("TMP") {
        return PathBuf::from(tmp).join("journal-todo");
    }
    // Last resort: current directory
    PathBuf::from(".")
}

/// Initialize the logger - tries the given directory first, then fallback
pub fn init(log_dir: Option<&PathBuf>) -> PathBuf {
    let dir = match log_dir {
        Some(d) => d.clone(),
        None => get_fallback_log_dir(),
    };

    // Try to create the directory
    if let Err(e) = std::fs::create_dir_all(&dir) {
        eprintln!("Warning: Failed to create log directory {:?}: {}", dir, e);
        // Try fallback
        let fallback = get_fallback_log_dir();
        let _ = std::fs::create_dir_all(&fallback);
    }

    let log_path = dir.join("journal-todo.log");

    // Open log file in append mode
    match OpenOptions::new().create(true).append(true).open(&log_path) {
        Ok(file) => {
            let mut log_file = LOG_FILE.lock().unwrap();
            *log_file = Some(file);

            let mut path = LOG_PATH.lock().unwrap();
            *path = Some(log_path.clone());
        }
        Err(e) => {
            eprintln!("Warning: Failed to open log file {:?}: {}", log_path, e);
            // Try fallback location
            let fallback_path = get_fallback_log_dir().join("journal-todo.log");
            if let Ok(file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&fallback_path)
            {
                let mut log_file = LOG_FILE.lock().unwrap();
                *log_file = Some(file);

                let mut path = LOG_PATH.lock().unwrap();
                *path = Some(fallback_path);
            }
        }
    }

    // Write startup marker
    log("========================================");
    log(&format!(
        "Application started at {}",
        Local::now().format("%Y-%m-%d %H:%M:%S")
    ));
    log(&format!("Log directory: {}", dir.display()));
    log("========================================");

    log_path
}

/// Initialize logger with fallback only (for early startup)
pub fn init_early() -> PathBuf {
    init(None)
}

/// Log a message to the file
pub fn log(message: &str) {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let formatted = format!("[{}] {}\n", timestamp, message);

    // Also print to console for dev mode
    print!("{}", formatted);

    // Write to file
    if let Ok(mut guard) = LOG_FILE.lock() {
        if let Some(ref mut file) = *guard {
            let _ = file.write_all(formatted.as_bytes());
            let _ = file.flush();
        }
    }
}

/// Log an error message
pub fn error(message: &str) {
    log(&format!("ERROR: {}", message));
}

/// Log an info message
pub fn info(message: &str) {
    log(&format!("INFO: {}", message));
}

/// Get the log file path
pub fn get_log_path() -> Option<PathBuf> {
    LOG_PATH.lock().ok().and_then(|guard| guard.clone())
}
