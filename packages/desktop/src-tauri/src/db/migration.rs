use sqlparser::dialect::SQLiteDialect;
use sqlparser::parser::Parser;
use sqlx::SqlitePool;
use std::fs;
use std::path::{Path, PathBuf};

pub struct Migration {
    pool: SqlitePool,
    migrations_dir: PathBuf,
}

impl Migration {
    pub const MIGRATION_TABLE_NAME: &'static str = "__migration__";

    pub fn new(pool: SqlitePool, migrations_dir: PathBuf) -> Self {
        Self {
            pool,
            migrations_dir,
        }
    }

    /// Run all pending migrations
    pub async fn run(&self) -> Result<(), String> {
        println!("[migration] Running SQL migrations.");
        Self::setup_migration_table(&self.pool).await?;

        let migration_files = self.get_migration_files()?;
        let mut migrations_count = 0;

        for file in migration_files {
            let file_name = file.clone();
            let sql = fs::read_to_string(format!(
                "{}{}{}",
                self.migrations_dir.to_string_lossy(),
                std::path::MAIN_SEPARATOR,
                file
            ))
            .map_err(|e| format!("Failed to read migration {}: {}", file, e))?;

            if self.is_migration_applied(&file_name).await? {
                continue;
            }

            migrations_count += 1;
            println!("[migration] Applying migration: {}", file_name);
            if let Err(err) = self.apply_migration(&file_name, &sql).await {
                // If tables already exist, treat as applied and continue
                if err.contains("already exists") {
                    println!(
                        "[migration] Migration {} already applied (tables exist). Marking as applied.",
                        file_name
                    );
                    self.mark_migration_applied(&file_name).await?;
                    continue;
                }

                println!(
                    "[migration] Migration failed: {}\nError: {}",
                    file_name, err
                );
                return Err(err);
            }

            println!("[migration] Migration applied: {}", file_name);
        }

        println!(
            "[migration] Migration completed. {} new migrations applied.",
            migrations_count
        );

        Ok(())
    }

    /// Create the migration tracking table if it doesn't exist
    pub async fn setup_migration_table(pool: &SqlitePool) -> Result<(), String> {
        sqlx::query(&format!(
            "CREATE TABLE IF NOT EXISTS {} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );",
            Self::MIGRATION_TABLE_NAME
        ))
        .execute(pool)
        .await
        .map_err(|err| err.to_string())?;
        Ok(())
    }

    /// Get list of migration files sorted by name
    fn get_migration_files(&self) -> Result<Vec<String>, String> {
        let path = Path::new(&self.migrations_dir);

        if !path.exists() {
            return Err(format!(
                "Migration folder not found: {}",
                self.migrations_dir.to_string_lossy()
            ));
        }

        let mut files: Vec<String> = fs::read_dir(path)
            .map_err(|e| e.to_string())?
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let path = entry.path();
                if path.extension()?.to_str()? == "sql" {
                    Some(path.file_name()?.to_string_lossy().to_string())
                } else {
                    None
                }
            })
            .collect();

        files.sort();
        Ok(files)
    }

    /// Check if a migration has already been applied
    async fn is_migration_applied(&self, name: &str) -> Result<bool, String> {
        let res: Option<(i64,)> = sqlx::query_as(&format!(
            "SELECT id FROM {} WHERE name = ? LIMIT 1;",
            Self::MIGRATION_TABLE_NAME
        ))
        .bind(name)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(res.is_some())
    }

    /// Mark a migration as applied without running it
    async fn mark_migration_applied(&self, name: &str) -> Result<(), String> {
        sqlx::query(&format!(
            "INSERT OR IGNORE INTO {} (name) VALUES (?)",
            Self::MIGRATION_TABLE_NAME
        ))
        .bind(name)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Apply a single migration within a transaction
    async fn apply_migration(&self, name: &str, sql: &str) -> Result<(), String> {
        // Parse SQL statements - handle Drizzle's statement-breakpoint comments
        let cleaned_sql = sql
            .lines()
            .filter(|line| !line.trim().starts_with("-->"))
            .collect::<Vec<_>>()
            .join("\n");

        let dialect = SQLiteDialect {};
        let statements = Parser::parse_sql(&dialect, &cleaned_sql).map_err(|e| e.to_string())?;

        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        for statement in statements {
            let sql_str = statement.to_string();
            sqlx::query(&sql_str)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("{}: {}", name, e))?;
        }

        // Record the migration
        sqlx::query(&format!(
            "INSERT INTO {} (name) VALUES (?)",
            Self::MIGRATION_TABLE_NAME
        ))
        .bind(name)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;

        Ok(())
    }
}
