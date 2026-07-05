// Forces every test run onto an in-memory SQLite DB. Must take effect before
// db.ts (imported transitively by app.ts/store.ts) reads DB_PATH at module
// load — vitest evaluates setupFiles before the test files themselves, so
// this assignment always wins the race.
process.env.DB_PATH = ':memory:';
