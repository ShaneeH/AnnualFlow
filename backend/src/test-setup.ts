// Loaded before the test files so modules that require configuration can be
// imported without a real database. The pool connects lazily, so tests that
// never query the database do not need a running PostgreSQL server.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:5432/test";
