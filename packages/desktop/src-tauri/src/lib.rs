mod db;
mod logger;

use db::{DatabaseState, Migration, execute_single_sql, execute_batch_sql};
use std::path::{Path, PathBuf};
use tauri::Manager;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger FIRST with fallback location
    // This ensures we can log even if app_data_dir fails
    let log_path = logger::init_early();
    logger::info(&format!("Early log initialized at: {}", log_path.display()));
    
    tauri::Builder::default()
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
            
            // Re-initialize logger in proper location
            logger::init(Some(&app_data_dir));
            logger::info("Logger re-initialized in app data directory");

            // Determine database path based on build mode
            #[cfg(debug_assertions)]
            let db_path = {
                logger::info("Running in DEBUG mode");
                let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
                    .unwrap_or_else(|_| ".".to_string());
                PathBuf::from(manifest_dir).parent().unwrap_or(Path::new(".")).join("journal-dev.db")
            };
            
            #[cfg(not(debug_assertions))]
            let db_path = {
                logger::info("Running in RELEASE mode");
                if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
                    logger::error(&format!("Failed to create app data directory: {}", e));
                }
                app_data_dir.join("journal.db")
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
            execute_single_sql,
            execute_batch_sql
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
