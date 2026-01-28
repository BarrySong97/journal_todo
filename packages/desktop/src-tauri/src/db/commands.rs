use serde::{Deserialize, Serialize};
use sqlx::{Row, Column, SqlitePool, TypeInfo};
use tauri::State;

use super::DatabaseState;

#[derive(Debug, Serialize, Deserialize)]
pub struct SqlRequest {
    pub sql: String,
    pub params: Vec<serde_json::Value>,
    pub method: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchSqlRequest {
    pub queries: Vec<SqlRequest>,
}

/// Row format expected by Drizzle sqlite-proxy
/// columns: column names in order
/// rows: values in the same order as columns
#[derive(Debug, Serialize, Deserialize)]
pub struct SqlRow {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SqlResponse {
    pub rows: Vec<SqlRow>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchSqlResponse {
    pub results: Vec<SqlResponse>,
}

/// Convert a SQLite row to the format expected by Drizzle
fn row_to_sql_row(row: &sqlx::sqlite::SqliteRow) -> SqlRow {
    let columns: Vec<String> = row.columns().iter().map(|c| c.name().to_string()).collect();
    let values: Vec<serde_json::Value> = (0..row.len())
        .map(|i| sqlx_value_to_json(row, i))
        .collect();

    SqlRow {
        columns,
        rows: values,
    }
}

/// Convert a SQLite value to JSON, handling different types
fn sqlx_value_to_json(row: &sqlx::sqlite::SqliteRow, index: usize) -> serde_json::Value {
    let col = row.column(index);
    let type_name = col.type_info().name();

    match type_name {
        "INTEGER" => match row.try_get::<Option<i64>, _>(index) {
            Ok(Some(i)) => serde_json::Value::from(i),
            Ok(None) => serde_json::Value::Null,
            Err(_) => serde_json::Value::Null,
        },
        "REAL" => match row.try_get::<Option<f64>, _>(index) {
            Ok(Some(f)) => serde_json::to_value(f).unwrap_or(serde_json::Value::Null),
            Ok(None) => serde_json::Value::Null,
            Err(_) => serde_json::Value::Null,
        },
        "TEXT" => match row.try_get::<Option<String>, _>(index) {
            Ok(Some(s)) => serde_json::Value::String(s),
            Ok(None) => serde_json::Value::Null,
            Err(_) => serde_json::Value::Null,
        },
        "BLOB" => match row.try_get::<Option<Vec<u8>>, _>(index) {
            Ok(Some(bytes)) => {
                // Try to decode as UTF-8 string first
                match String::from_utf8(bytes.clone()) {
                    Ok(s) => serde_json::Value::String(s),
                    Err(_) => serde_json::Value::Null,
                }
            }
            Ok(None) => serde_json::Value::Null,
            Err(_) => serde_json::Value::Null,
        },
        // NULL type
        "NULL" => serde_json::Value::Null,
        // Default: try as string
        _ => match row.try_get::<Option<String>, _>(index) {
            Ok(Some(s)) => serde_json::Value::String(s),
            Ok(None) => serde_json::Value::Null,
            Err(_) => serde_json::Value::Null,
        },
    }
}

/// Internal helper that executes SQL without requiring Tauri State.
/// Used by both the Tauri command and tests.
async fn execute_sql_internal(
    pool: &SqlitePool,
    request: SqlRequest,
) -> Result<SqlResponse, String> {
    let mut query = sqlx::query(&request.sql);
    
    // Bind parameters
    for param in &request.params {
        query = match param {
            serde_json::Value::Null => query.bind(None::<String>),
            serde_json::Value::Bool(b) => query.bind(b),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    query.bind(i)
                } else if let Some(f) = n.as_f64() {
                    query.bind(f)
                } else {
                    return Err("Invalid number parameter".to_string());
                }
            }
            serde_json::Value::String(s) => query.bind(s),
            // Handle arrays (for JSON columns like tags)
            serde_json::Value::Array(_) => {
                let json_str = serde_json::to_string(param).map_err(|e| e.to_string())?;
                query.bind(json_str)
            }
            serde_json::Value::Object(_) => {
                let json_str = serde_json::to_string(param).map_err(|e| e.to_string())?;
                query.bind(json_str)
            }
        };
    }
    
    // Branch on method type
    if request.method == "run" {
        // For INSERT, UPDATE, DELETE - use execute instead of fetch_all
        query
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        
        // Return empty rows for run method
        return Ok(SqlResponse { rows: Vec::new() });
    }
    
    // For SELECT queries - use fetch_all
    let rows = query
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;
    
    let result_rows: Vec<SqlRow> = rows.iter().map(row_to_sql_row).collect();
    
    Ok(SqlResponse { rows: result_rows })
}

#[tauri::command]
pub async fn execute_single_sql(
    state: State<'_, DatabaseState>,
    request: SqlRequest,
) -> Result<SqlResponse, String> {
    let pool = state.pool.lock().await;
    execute_sql_internal(&pool, request).await
}

#[tauri::command]
pub async fn execute_batch_sql(
    state: State<'_, DatabaseState>,
    request: BatchSqlRequest,
) -> Result<BatchSqlResponse, String> {
    let pool = state.pool.lock().await;
    let mut results = Vec::new();
    
    for query_request in request.queries {
        let result = execute_sql_internal(&pool, query_request).await?;
        results.push(result);
    }
    
    Ok(BatchSqlResponse { results })
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn create_test_db() -> Result<SqlitePool, sqlx::Error> {
        // Use in-memory database for tests
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect("sqlite::memory:")
            .await?;
        
        Ok(pool)
    }

    #[tokio::test]
    async fn test_execute_single_sql_run_insert() {
        let pool = create_test_db().await.expect("Failed to create test DB");
        
        // Create table
        let create_table = SqlRequest {
            sql: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)".to_string(),
            params: vec![],
            method: "run".to_string(),
        };
        
        let result = execute_sql_internal(&pool, create_table).await;
        assert!(result.is_ok(), "Failed to create table: {:?}", result);
        
        // Insert a row
        let insert = SqlRequest {
            sql: "INSERT INTO users (name) VALUES (?)".to_string(),
            params: vec![serde_json::Value::String("Alice".to_string())],
            method: "run".to_string(),
        };
        
        let result = execute_sql_internal(&pool, insert).await;
        assert!(result.is_ok(), "Failed to insert: {:?}", result);
        assert_eq!(result.unwrap().rows.len(), 0, "run method should return empty rows");
    }

    #[tokio::test]
    async fn test_execute_single_sql_all_select() {
        let pool = create_test_db().await.expect("Failed to create test DB");
        
        // Create and populate table
        let create_table = SqlRequest {
            sql: "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL)".to_string(),
            params: vec![],
            method: "run".to_string(),
        };
        execute_sql_internal(&pool, create_table).await.expect("Failed to create table");
        
        let insert1 = SqlRequest {
            sql: "INSERT INTO products (name, price) VALUES (?, ?)".to_string(),
            params: vec![
                serde_json::Value::String("Widget".to_string()),
                serde_json::Value::Number(serde_json::Number::from_f64(9.99).unwrap()),
            ],
            method: "run".to_string(),
        };
        execute_sql_internal(&pool, insert1).await.expect("Failed to insert");
        
        let insert2 = SqlRequest {
            sql: "INSERT INTO products (name, price) VALUES (?, ?)".to_string(),
            params: vec![
                serde_json::Value::String("Gadget".to_string()),
                serde_json::Value::Number(serde_json::Number::from_f64(19.99).unwrap()),
            ],
            method: "run".to_string(),
        };
        execute_sql_internal(&pool, insert2).await.expect("Failed to insert");
        
        // Select all
        let select = SqlRequest {
            sql: "SELECT id, name, price FROM products ORDER BY id".to_string(),
            params: vec![],
            method: "all".to_string(),
        };
        
        let result = execute_sql_internal(&pool, select).await;
        assert!(result.is_ok(), "Failed to select: {:?}", result);
        
        let response = result.unwrap();
        assert_eq!(response.rows.len(), 2, "Should have 2 rows");
        
        // Verify first row - now using the new format
        let row1 = &response.rows[0];
        assert_eq!(row1.columns, vec!["id", "name", "price"]);
        assert_eq!(row1.rows[1], "Widget");
        assert_eq!(row1.rows[2], 9.99);
        
        // Verify second row
        let row2 = &response.rows[1];
        assert_eq!(row2.rows[1], "Gadget");
        assert_eq!(row2.rows[2], 19.99);
    }

    #[tokio::test]
    async fn test_execute_single_sql_get_single_row() {
        let pool = create_test_db().await.expect("Failed to create test DB");
        
        // Create and populate table
        let create_table = SqlRequest {
            sql: "CREATE TABLE items (id INTEGER PRIMARY KEY, title TEXT, active INTEGER)".to_string(),
            params: vec![],
            method: "run".to_string(),
        };
        execute_sql_internal(&pool, create_table).await.expect("Failed to create table");
        
        let insert = SqlRequest {
            sql: "INSERT INTO items (title, active) VALUES (?, ?)".to_string(),
            params: vec![
                serde_json::Value::String("Important Task".to_string()),
                serde_json::Value::Number(serde_json::Number::from(1)),
            ],
            method: "run".to_string(),
        };
        execute_sql_internal(&pool, insert).await.expect("Failed to insert");
        
        // Select single row
        let select = SqlRequest {
            sql: "SELECT id, title, active FROM items WHERE id = ?".to_string(),
            params: vec![serde_json::Value::Number(serde_json::Number::from(1))],
            method: "get".to_string(),
        };
        
        let result = execute_sql_internal(&pool, select).await;
        assert!(result.is_ok(), "Failed to select: {:?}", result);
        
        let response = result.unwrap();
        assert_eq!(response.rows.len(), 1, "Should have 1 row");
        
        let row = &response.rows[0];
        assert_eq!(row.rows[1], "Important Task");
        assert_eq!(row.rows[2], 1);
    }

    #[tokio::test]
    async fn test_execute_single_sql_with_null_parameter() {
        let pool = create_test_db().await.expect("Failed to create test DB");
        
        // Create table
        let create_table = SqlRequest {
            sql: "CREATE TABLE notes (id INTEGER PRIMARY KEY, content TEXT)".to_string(),
            params: vec![],
            method: "run".to_string(),
        };
        execute_sql_internal(&pool, create_table).await.expect("Failed to create table");
        
        // Insert with NULL
        let insert = SqlRequest {
            sql: "INSERT INTO notes (content) VALUES (?)".to_string(),
            params: vec![serde_json::Value::Null],
            method: "run".to_string(),
        };
        
        let result = execute_sql_internal(&pool, insert).await;
        assert!(result.is_ok(), "Failed to insert with NULL: {:?}", result);
        
        // Select and verify NULL handling
        let select = SqlRequest {
            sql: "SELECT id, content FROM notes WHERE id = 1".to_string(),
            params: vec![],
            method: "get".to_string(),
        };
        
        let result = execute_sql_internal(&pool, select).await;
        assert!(result.is_ok());
        
        let response = result.unwrap();
        assert_eq!(response.rows.len(), 1);
        // Content should be NULL
        let content = &response.rows[0].rows[1];
        assert_eq!(*content, serde_json::Value::Null, "Content should be NULL");
    }
}
