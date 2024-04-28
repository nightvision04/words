import knex from 'knex';

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './mydb.sqlite'
  },
  useNullAsDefault: true
});

export default db;
