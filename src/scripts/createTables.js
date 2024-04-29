const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const createPlayersTable = async () => {
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
      CurrentGame INTEGER,
      Token TEXT,
      TokenExpiry TEXT
    )
  `);

  console.log('Players table created');
  await db.close();
};


createPlayersTable().catch(err => {
  console.error('Error creating table:', err);
});

const createInvitationsTable = async () => {
  const db = await open({
    filename: 'mydatabase.db',
    driver: sqlite3.Database
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Invitations (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      SenderId INTEGER,
      ReceiverId INTEGER,
      Status TEXT DEFAULT 'pending',  -- could be 'pending', 'accepted', 'rejected'
      DateCreated TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (SenderId) REFERENCES Players(Id),
      FOREIGN KEY (ReceiverId) REFERENCES Players(Id)
    )
  `);

  console.log('Invitations table created');
  await db.close();
};

createInvitationsTable().catch(err => {
  console.error('Error creating table:', err);
});

const createGamesTable = async () => {
  const db = await open({
      filename: 'mydatabase.db',
      driver: sqlite3.Database
  });

  await db.exec(`
      CREATE TABLE IF NOT EXISTS Games (
          Id INTEGER PRIMARY KEY AUTOINCREMENT,
          CreatorId INTEGER,
          JoinerId INTEGER,
          Board TEXT,  -- Will hold JSON representation of the board
          CreatorPieces TEXT,  -- JSON of pieces
          JoinerPieces TEXT,  -- JSON of pieces
          DateCreated TEXT DEFAULT (datetime('now')),
          CreatorScore INTEGER DEFAULT 0,
          JoinerScore INTEGER DEFAULT 0,
          Turn TEXT CHECK(Turn IN ('creator', 'joiner')),  -- Enforce valid values
          IsStarted INTEGER DEFAULT 0,
          IsCompleted INTEGER DEFAULT 0,
          Winner INTEGER,  -- ID of the winner
          Loser INTEGER,  -- ID of the loser
          FOREIGN KEY (CreatorId) REFERENCES Players(Id),
          FOREIGN KEY (JoinerId) REFERENCES Players(Id),
          FOREIGN KEY (Winner) REFERENCES Players(Id),
          FOREIGN KEY (Loser) REFERENCES Players(Id)
      )
  `);

  console.log('Games table created');
  await db.close();
}

createGamesTable().catch(err => {
  console.error('Error creating table:', err);
});
