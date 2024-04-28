
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function setupDatabase() {
    const db = await open({
        filename: 'mydatabase.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS Players (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            DateCreated TEXT DEFAULT (datetime('now')),
            Name TEXT NOT NULL UNIQUE,
            LastLogin TEXT DEFAULT (datetime('now')),
            OverallScore INTEGER DEFAULT 0,
            Wins INTEGER DEFAULT 0,
            Losses INTEGER DEFAULT 0,
            GameCount INTEGER DEFAULT 0,
            LastModified TEXT DEFAULT (datetime('now')),
            CurrentGame INTEGER
        )
    `);

    return db;
}

export default setupDatabase;
