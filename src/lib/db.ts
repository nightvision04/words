import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function setupDatabase() {
    return await open({
        filename: 'mydatabase.db',
        driver: sqlite3.Database
    });
}

export default setupDatabase;
