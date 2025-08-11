/**
 * MySQL to PostgreSQL Migration Script
 * 
 * This script helps migrate data from MySQL to PostgreSQL (NeonBase)
 * for Vercel deployment.
 * 
 * Usage: 
 * 1. Configure your .env file with both MySQL and NeonBase credentials
 * 2. Run: node migrate-to-neon.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

// MySQL Connection
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'testmysql',
};

// PostgreSQL (NeonBase) Connection
const pgConfig = {
  host: process.env.NEON_DB_HOST,
  port: process.env.NEON_DB_PORT || 5432,
  user: process.env.NEON_DB_USER,
  password: process.env.NEON_DB_PASSWORD,
  database: process.env.NEON_DB_NAME,
  ssl: process.env.NEON_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Tables to migrate
const tables = [
  'cosmetic_notifications',
  'cosmetic_notifications_cancelled'
];

// Main migration function
async function migrateData() {
  console.log('Starting migration from MySQL to PostgreSQL (NeonBase)...');
  
  // Connect to MySQL
  const mysqlConn = await mysql.createConnection(mysqlConfig);
  console.log('✅ Connected to MySQL database');
  
  // Connect to PostgreSQL
  const pgPool = new Pool(pgConfig);
  const pgClient = await pgPool.connect();
  console.log('✅ Connected to PostgreSQL (NeonBase) database');
  
  try {
    // Process each table
    for (const table of tables) {
      console.log(`\nMigrating table: ${table}`);
      
      // 1. Get table structure from MySQL
      const [columns] = await mysqlConn.query(`SHOW COLUMNS FROM ${table}`);
      console.log(`Found ${columns.length} columns in MySQL table`);
      
      // 2. Create table in PostgreSQL if it doesn't exist
      const createTableSQL = generateCreateTableSQL(table, columns);
      await pgClient.query(createTableSQL);
      console.log(`Created table in PostgreSQL if it didn't exist`);
      
      // 3. Get data from MySQL
      const [rows] = await mysqlConn.query(`SELECT * FROM ${table}`);
      console.log(`Found ${rows.length} rows to migrate`);
      
      // 4. Insert data into PostgreSQL
      if (rows.length > 0) {
        let migratedCount = 0;
        
        // Process in batches of 100
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          await insertBatch(pgClient, table, columns, batch);
          migratedCount += batch.length;
          console.log(`Migrated ${migratedCount}/${rows.length} rows...`);
        }
        
        console.log(`✅ Successfully migrated all ${rows.length} rows for table ${table}`);
      } else {
        console.log(`⚠️ No data to migrate for table ${table}`);
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connections
    await mysqlConn.end();
    pgClient.release();
    await pgPool.end();
    console.log('Connections closed');
  }
}

// Generate CREATE TABLE SQL for PostgreSQL
function generateCreateTableSQL(tableName, columns) {
  const columnDefinitions = columns.map(col => {
    // Map MySQL types to PostgreSQL types
    let pgType;
    const mysqlType = col.Type.toLowerCase();
    
    if (mysqlType.includes('int')) pgType = 'INTEGER';
    else if (mysqlType.includes('varchar')) pgType = `VARCHAR(${mysqlType.match(/\d+/)?.[0] || 255})`;
    else if (mysqlType.includes('text')) pgType = 'TEXT';
    else if (mysqlType.includes('datetime')) pgType = 'TIMESTAMP';
    else if (mysqlType.includes('date')) pgType = 'DATE';
    else if (mysqlType.includes('decimal')) pgType = mysqlType.replace('decimal', 'NUMERIC');
    else if (mysqlType.includes('float')) pgType = 'FLOAT';
    else if (mysqlType.includes('double')) pgType = 'DOUBLE PRECISION';
    else if (mysqlType.includes('boolean') || mysqlType.includes('tinyint(1)')) pgType = 'BOOLEAN';
    else pgType = 'TEXT'; // Default fallback
    
    const nullable = col.Null === 'YES' ? '' : 'NOT NULL';
    const defaultValue = col.Default !== null ? `DEFAULT ${col.Default === 'CURRENT_TIMESTAMP' ? 'CURRENT_TIMESTAMP' : `'${col.Default}'`}` : '';
    
    return `"${col.Field}" ${pgType} ${nullable} ${defaultValue}`.trim();
  });
  
  // Find primary key
  const primaryKey = columns.find(col => col.Key === 'PRI');
  const primaryKeyClause = primaryKey ? `, PRIMARY KEY ("${primaryKey.Field}")` : '';
  
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefinitions.join(', ')}${primaryKeyClause})`;
}

// Insert a batch of rows
async function insertBatch(pgClient, tableName, columns, rows) {
  if (rows.length === 0) return;
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  try {
    for (const row of rows) {
      const columnNames = columns.map(col => `"${col.Field}"`).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const values = columns.map(col => row[col.Field]);
      
      const query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      await pgClient.query(query, values);
    }
    
    // Commit transaction
    await pgClient.query('COMMIT');
  } catch (error) {
    // Rollback on error
    await pgClient.query('ROLLBACK');
    throw error;
  }
}

// Run the migration
migrateData().catch(console.error);