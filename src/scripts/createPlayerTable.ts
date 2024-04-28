import db from '../lib/db.ts';

const createPlayersTable = async (): Promise<void> => {
  if (!await db.schema.hasTable('Players')) {
    await db.schema.createTable('Players', table => {
      table.increments('Id').primary();
      table.timestamp('DateCreated').defaultTo(db.fn.now());
      table.string('Name').notNullable();
      table.timestamp('LastLogin').defaultTo(db.fn.now());
      table.integer('OverallScore').defaultTo(0);
      table.integer('Wins').defaultTo(0);
      table.integer('Losses').defaultTo(0);
      table.integer('GameCount').defaultTo(0);
      table.timestamp('LastModified').defaultTo(db.fn.now());
      table.integer('CurrentGame').nullable();
    });
  
    console.log('Players table created');
  }
};

createPlayersTable().catch(err => {
  console.error('Error creating table:', err);
});
