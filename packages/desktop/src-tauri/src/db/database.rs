use sqlx::{SqlitePool, sqlite::{SqlitePoolOptions, SqliteConnectOptions}};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct DatabaseState {
    pub pool: Arc<Mutex<SqlitePool>>,
}

impl DatabaseState {
    pub async fn new(db_path: &str) -> Result<Self, sqlx::Error> {
        // Create parent directory if it doesn't exist
        if let Some(parent) = std::path::Path::new(db_path).parent() {
            std::fs::create_dir_all(parent).ok();
        }

        // Use SqliteConnectOptions to avoid URL parsing issues on Windows
        let options = SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        Ok(Self {
            pool: Arc::new(Mutex::new(pool)),
        })
    }
}
