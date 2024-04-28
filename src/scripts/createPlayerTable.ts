import setupDatabase from '../lib/db';

const createPlayersTable = async (): Promise<void> => {
  const db = await setupDatabase();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Players (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      DateCreated TEXT DEFAULT (datetime('now')),
      Name TEXT NOT NOT NULL UNIQUE,
      LastLogin TEXT DEFAULT (datetime('now')),
      OverallScore INTEGER DEFAULT 0,
      Wins INTEGER DEFAULT 0,
      Losses INTEGER DEFAULT 0,
      GameCount INTEGER DEFAULT 0,
      LastModified TEXT DEFAULT (datetime('now')),
      CurrentGame INTEGER
    )
  `);

  console.log('Players table created');
  await db.close();
};

createPlayersTable().catch(err => {
  console.error('Error creating table:', err);
});
