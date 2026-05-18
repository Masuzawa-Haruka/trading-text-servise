const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const migrationPath = path.join(__dirname, '../../docs/migrations/20260518_add_cancellation_rls.sql');
  console.log('Reading migration file from:', migrationPath);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Executing migration SQL...');
  await prisma.$executeRawUnsafe(sql);
  console.log('Migration successfully applied!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
