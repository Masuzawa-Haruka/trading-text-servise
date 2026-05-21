# Schema Sync

`schema:check` verifies that `backend/prisma/schema.prisma` and `docs/supabase_schema.sql`
describe the same core database shape.

It currently checks:

- Prisma enum names and values against `CREATE TYPE ... AS ENUM`
- Prisma model `@@map(...)` table names against `CREATE TABLE`
- Scalar and enum model fields against SQL columns
- Enum column defaults

Run:

```bash
npm run schema:check
```

This is a guardrail for reviews and CI. It does not rewrite either schema file.
