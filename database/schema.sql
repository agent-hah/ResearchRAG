-- Research Workspace MVP Database Schema

-- Datasets table: stores metadata about uploaded CSV files
CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    row_count INTEGER,
    column_count INTEGER,
    file_size_bytes INTEGER,
    table_name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active'
);

-- Literature table: stores metadata about uploaded PDF files
CREATE TABLE IF NOT EXISTS literature (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status TEXT DEFAULT 'pending',
    page_count INTEGER,
    file_size_bytes INTEGER,
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'active'
);

-- Notes table: stores user notes and annotations
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    status TEXT DEFAULT 'active'
);

-- Query history table: stores past queries for reference
CREATE TABLE IF NOT EXISTS query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_text TEXT NOT NULL,
    sql_query TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dataset_id INTEGER,
    result_count INTEGER,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
);

-- Visualization history table: stores generated visualizations
CREATE TABLE IF NOT EXISTS visualizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_id INTEGER,
    viz_type TEXT NOT NULL,
    viz_config TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (query_id) REFERENCES query_history(id)
);
