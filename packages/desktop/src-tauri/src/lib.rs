mod db;
mod logger;

use db::{DatabaseState, Migration, execute_single_sql, execute_batch_sql};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command as ProcessCommand;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::oneshot;

struct AppPaths {
    db_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct DatabaseConfig {
    custom_db_path: Option<String>,
}

fn runtime_env_label() -> &'static str {
    #[cfg(debug_assertions)]
    {
        "debug"
    }

    #[cfg(not(debug_assertions))]
    {
        "release"
    }
}

fn database_config_file_name(env_label: &str) -> String {
    format!("database-config.{}.json", env_label)
}

fn database_config_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir
        .join("DB")
        .join(database_config_file_name(runtime_env_label()))
}

fn read_database_config(config_path: &Path) -> Result<Option<DatabaseConfig>, String> {
    if !config_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(config_path)
        .map_err(|e| format!("Failed to read config {}: {}", config_path.display(), e))?;
    let config = serde_json::from_str::<DatabaseConfig>(&content)
        .map_err(|e| format!("Failed to parse config {}: {}", config_path.display(), e))?;
    Ok(Some(config))
}

fn write_database_config(config_path: &Path, config: &DatabaseConfig) -> Result<(), String> {
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory {}: {}", parent.display(), e))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize database config: {}", e))?;
    fs::write(config_path, content)
        .map_err(|e| format!("Failed to write config {}: {}", config_path.display(), e))
}

fn resolve_default_database_path(app_data_dir: &Path) -> Result<PathBuf, String> {
    #[cfg(debug_assertions)]
    {
        let _ = app_data_dir;
        logger::info("Running in DEBUG mode");
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
            .unwrap_or_else(|_| ".".to_string());
        Ok(PathBuf::from(manifest_dir)
            .parent()
            .unwrap_or(Path::new("."))
            .join("journal-dev.db"))
    }

    #[cfg(not(debug_assertions))]
    {
        logger::info("Running in RELEASE mode");
        fs::create_dir_all(app_data_dir).map_err(|e| {
            format!(
                "Failed to create app data directory {}: {}",
                app_data_dir.display(),
                e
            )
        })?;

        let db_dir = app_data_dir.join("DB");
        fs::create_dir_all(&db_dir)
            .map_err(|e| format!("Failed to create DB directory {}: {}", db_dir.display(), e))?;

        let legacy_db = app_data_dir.join("journal.db");
        let new_db = db_dir.join("journal.db");

        if legacy_db.exists() {
            if new_db.exists() {
                logger::info(&format!(
                    "Legacy database exists but new DB already present, skipping migration. legacy={}, new={}",
                    legacy_db.display(),
                    new_db.display()
                ));
            } else {
                logger::info(&format!(
                    "Migrating legacy database to new DB directory: {} -> {}",
                    legacy_db.display(),
                    new_db.display()
                ));
                fs::rename(&legacy_db, &new_db).map_err(|e| {
                    format!(
                        "Failed to migrate legacy database {} -> {}: {}",
                        legacy_db.display(),
                        new_db.display(),
                        e
                    )
                })?;
                logger::info("Legacy database migration completed");
            }
        }

        Ok(new_db)
    }
}

fn resolve_database_path(app_data_dir: &Path) -> Result<PathBuf, String> {
    let default_db_path = resolve_default_database_path(app_data_dir)?;
    let config_path = database_config_path(app_data_dir);

    let config = read_database_config(&config_path)?;
    let custom_path = config
        .and_then(|cfg| cfg.custom_db_path)
        .map(|path| path.trim().to_string())
        .filter(|path| !path.is_empty())
        .map(PathBuf::from);

    if let Some(path) = custom_path {
        if path.exists() {
            logger::info(&format!(
                "Using custom database path from config: {}",
                path.display()
            ));
            return Ok(path);
        }

        logger::error(&format!(
            "Custom database path does not exist, falling back to default: {}",
            path.display()
        ));
    }

    Ok(default_db_path)
}

fn is_sqlite_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let lower = ext.to_lowercase();
            lower == "db" || lower == "sqlite" || lower == "sqlite3"
        })
        .unwrap_or(false)
}

async fn validate_database_file(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("Selected file does not exist: {}", path.display()));
    }
    if !path.is_file() {
        return Err(format!("Selected path is not a file: {}", path.display()));
    }
    if !is_sqlite_file(path) {
        return Err("Only .db/.sqlite/.sqlite3 files are supported".into());
    }

    fs::File::open(path)
        .map_err(|e| format!("Failed to open selected database file {}: {}", path.display(), e))?;

    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .map_err(|e| format!("Selected file is not a valid SQLite database: {}", e))?;
    drop(pool);

    Ok(())
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_devtools(webview: tauri::Webview) {
    #[cfg(debug_assertions)]
    webview.open_devtools();
}

/// Get the log file path for debugging
#[tauri::command]
fn get_log_path() -> Option<String> {
    logger::get_log_path().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn get_database_path(paths: tauri::State<'_, AppPaths>) -> String {
    paths.db_path.clone()
}

#[tauri::command]
fn reveal_database_file(paths: tauri::State<'_, AppPaths>) -> Result<(), String> {
    let db_path = PathBuf::from(paths.db_path.clone());
    if !db_path.exists() {
        return Err(format!("Database file does not exist: {}", db_path.display()));
    }

    #[cfg(target_os = "macos")]
    {
        let status = ProcessCommand::new("open")
            .arg("-R")
            .arg(&db_path)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to reveal database file in Finder".into());
        }
    }

    #[cfg(target_os = "windows")]
    {
        let select_arg = format!("/select,{}", db_path.display());
        let status = ProcessCommand::new("explorer")
            .arg(select_arg)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to reveal database file in File Explorer".into());
        }
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let parent = db_path
            .parent()
            .ok_or_else(|| format!("Failed to resolve parent for {}", db_path.display()))?;
        let status = ProcessCommand::new("xdg-open")
            .arg(parent)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to open database directory".into());
        }
    }

    Ok(())
}

#[tauri::command]
async fn select_and_set_database_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .file()
        .add_filter("SQLite Database", &["db", "sqlite", "sqlite3"])
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    let file_path = rx
        .await
        .map_err(|_| "Failed to receive selected file path".to_string())?;
    let Some(file_path) = file_path else {
        return Ok(None);
    };

    let selected_path = file_path
        .into_path()
        .map_err(|e| format!("Failed to convert selected file path: {}", e))?;

    validate_database_file(&selected_path).await?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let config_path = database_config_path(&app_data_dir);
    let selected_path_str = selected_path
        .to_str()
        .ok_or_else(|| "Failed to convert selected path to string".to_string())?
        .to_string();

    write_database_config(
        &config_path,
        &DatabaseConfig {
            custom_db_path: Some(selected_path_str.clone()),
        },
    )?;
    logger::info(&format!(
        "Updated custom database path at {} to {}",
        config_path.display(),
        selected_path_str
    ));

    Ok(Some(selected_path_str))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger FIRST with fallback location
    // This ensures we can log even if app_data_dir fails
    let log_path = logger::init_early();
    logger::info(&format!("Early log initialized at: {}", log_path.display()));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            logger::info("Tauri setup starting...");
            
            // Get app data directory
            let app_data_dir = match app.path().app_data_dir() {
                Ok(dir) => {
                    logger::info(&format!("App data directory: {}", dir.display()));
                    dir
                }
                Err(e) => {
                    logger::error(&format!("Failed to get app data directory: {}", e));
                    // Use fallback
                    let fallback = if let Ok(home) = std::env::var("USERPROFILE") {
                        PathBuf::from(home).join(".journal-todo")
                    } else {
                        PathBuf::from(".").join(".journal-todo")
                    };
                    logger::info(&format!("Using fallback directory: {}", fallback.display()));
                    fallback
                }
            };
            
            #[cfg(debug_assertions)]
            {
                // Keep debug logging behavior unchanged.
                logger::init(Some(&app_data_dir));
                logger::info("Logger re-initialized in app data directory");
            }

            #[cfg(not(debug_assertions))]
            {
                let logs_dir = app_data_dir.join("Logs");
                if let Err(e) = std::fs::create_dir_all(&logs_dir) {
                    logger::error(&format!("Failed to create logs directory: {}", e));
                }
                logger::init(Some(&logs_dir));
                logger::info(&format!(
                    "Logger re-initialized in logs directory: {}",
                    logs_dir.display()
                ));
            }

            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(err) = window.set_decorations(false) {
                        logger::error(&format!("Failed to disable Windows window decorations: {}", err));
                    }
                } else {
                    logger::error("Failed to get main window for Windows titlebar setup");
                }
            }

            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(err) = window.set_decorations(true) {
                        logger::error(&format!("Failed to enable macOS window decorations: {}", err));
                    }
                    if let Err(err) = window.set_title_bar_style(tauri::TitleBarStyle::Overlay) {
                        logger::error(&format!("Failed to set macOS title bar style: {}", err));
                    }
                } else {
                    logger::error("Failed to get main window for macOS titlebar setup");
                }
            }

            // Determine database path with environment-scoped custom override.
            let db_path = match resolve_database_path(&app_data_dir) {
                Ok(path) => path,
                Err(e) => {
                    logger::error(&format!("Failed to resolve database path: {}", e));
                    return Err(e.into());
                }
            };

            let db_path_str = match db_path.to_str() {
                Some(s) => s.to_string(),
                None => {
                    logger::error("Failed to convert database path to string");
                    return Err("Failed to convert database path to string".into());
                }
            };
            
            logger::info(&format!("Database path: {}", db_path_str));

            // Determine migrations path
            #[cfg(debug_assertions)]
            let migrations_dir = {
                let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
                    .unwrap_or_else(|_| ".".to_string());
                PathBuf::from(manifest_dir).join("migrations")
            };

            #[cfg(not(debug_assertions))]
            let migrations_dir = {
                logger::info("Resolving migrations directory...");
                
                // First, let's see what the resource directory looks like
                match app.path().resource_dir() {
                    Ok(resource_dir) => {
                        logger::info(&format!("Resource directory: {}", resource_dir.display()));
                        
                        // List contents
                        if let Ok(entries) = std::fs::read_dir(&resource_dir) {
                            logger::info("Resource directory contents:");
                            for entry in entries.flatten() {
                                let path = entry.path();
                                let is_dir = path.is_dir();
                                logger::info(&format!("  {} {}", if is_dir { "[DIR]" } else { "[FILE]" }, path.display()));
                            }
                        }
                    }
                    Err(e) => {
                        logger::error(&format!("Failed to get resource directory: {}", e));
                    }
                }
                
                // Try BaseDirectory::Resource first
                match app.path().resolve("migrations", tauri::path::BaseDirectory::Resource) {
                    Ok(path) => {
                        logger::info(&format!("Resolved migrations path via BaseDirectory::Resource: {}", path.display()));
                        path
                    }
                    Err(e) => {
                        logger::error(&format!("BaseDirectory::Resource failed: {}", e));
                        
                        // Fallback: try resource_dir directly
                        match app.path().resource_dir() {
                            Ok(resource_dir) => {
                                let fallback_path = resource_dir.join("migrations");
                                logger::info(&format!("Fallback migrations path: {}", fallback_path.display()));
                                fallback_path
                            }
                            Err(e2) => {
                                logger::error(&format!("resource_dir() also failed: {}", e2));
                                // Last resort: try executable directory
                                if let Ok(exe_path) = std::env::current_exe() {
                                    if let Some(exe_dir) = exe_path.parent() {
                                        let last_resort = exe_dir.join("migrations");
                                        logger::info(&format!("Last resort migrations path: {}", last_resort.display()));
                                        last_resort
                                    } else {
                                        logger::error("Cannot get exe parent directory");
                                        return Err(format!("Cannot find migrations directory: {}", e2).into());
                                    }
                                } else {
                                    logger::error("Cannot get current exe path");
                                    return Err(format!("Cannot find migrations directory: {}", e2).into());
                                }
                            }
                        }
                    }
                }
            };

            logger::info(&format!("Final migrations path: {}", migrations_dir.display()));

            // Check if migrations directory exists
            if migrations_dir.exists() {
                logger::info("Migrations directory exists");
                if let Ok(entries) = std::fs::read_dir(&migrations_dir) {
                    logger::info("Migration files:");
                    for entry in entries.flatten() {
                        logger::info(&format!("  - {}", entry.path().display()));
                    }
                }
            } else {
                logger::error(&format!("Migrations directory NOT FOUND: {}", migrations_dir.display()));
                return Err(format!("Migrations directory not found: {}", migrations_dir.display()).into());
            }

            // Initialize database
            logger::info("Initializing database...");
            
            let result = tauri::async_runtime::block_on(async {
                logger::info("Creating database connection...");
                let db_state = match DatabaseState::new(&db_path_str).await {
                    Ok(state) => {
                        logger::info("Database connection created");
                        state
                    }
                    Err(e) => {
                        logger::error(&format!("Failed to create database: {}", e));
                        return Err(format!("Failed to initialize database: {}", e));
                    }
                };

                logger::info("Running migrations...");
                let pool = db_state.pool.lock().await;
                let migration = Migration::new((*pool).clone(), migrations_dir.clone());
                if let Err(e) = migration.run().await {
                    logger::error(&format!("Migration failed: {}", e));
                    return Err(format!("Failed to run migrations: {}", e));
                }
                drop(pool);
                
                logger::info("Migrations completed");
                Ok(db_state)
            });

            match result {
                Ok(db_state) => {
                    app.manage(AppPaths {
                        db_path: db_path_str.clone(),
                    });
                    app.manage(db_state);
                    logger::info("Setup complete - database ready");
                    Ok(())
                }
                Err(e) => {
                    logger::error(&format!("Setup failed: {}", e));
                    Err(e.into())
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            open_devtools,
            get_log_path,
            get_database_path,
            reveal_database_file,
            select_and_set_database_path,
            execute_single_sql,
            execute_batch_sql
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{DatabaseConfig, database_config_file_name, read_database_config, write_database_config};
    use std::fs;
    use std::path::PathBuf;

    fn test_path(name: &str) -> PathBuf {
        let base = std::env::temp_dir().join("journal_todo_lib_tests");
        fs::create_dir_all(&base).expect("create temp test root");
        base.join(format!("{}_{}.json", name, std::process::id()))
    }

    #[test]
    fn uses_environment_scoped_config_filename() {
        assert_eq!(database_config_file_name("debug"), "database-config.debug.json");
        assert_eq!(database_config_file_name("release"), "database-config.release.json");
    }

    #[test]
    fn config_round_trip() {
        let path = test_path("db_config_round_trip");
        let cfg = DatabaseConfig {
            custom_db_path: Some("/tmp/custom.db".to_string()),
        };

        write_database_config(&path, &cfg).expect("write config");
        let loaded = read_database_config(&path).expect("read config");
        assert_eq!(
            loaded.and_then(|c| c.custom_db_path),
            Some("/tmp/custom.db".to_string())
        );

        let _ = fs::remove_file(path);
    }
}
