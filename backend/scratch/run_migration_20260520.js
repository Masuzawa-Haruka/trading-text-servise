const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  const migrationPath = path.join(__dirname, '../../docs/migrations/20260520_add_item_images_and_schedule_candidates.sql');
  console.log('Reading migration file from:', migrationPath);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Executing migration SQL on database...');
  await pool.query(sql);
  console.log('Migration successfully applied!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
