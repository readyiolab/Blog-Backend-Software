#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbName = process.env.DB_NAME;
const adminEmail = process.env.ADMIN_EMAIL || 'admin@beannews.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Deepak@12345';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';

if (!dbName) {
  console.error('DB_NAME is not set. Please configure backend/.env first.');
  process.exit(1);
}

async function main() {
  const connectionConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  };

  const rootConnection = await mysql.createConnection(connectionConfig);
  try {
    console.log(`Creating database if needed: ${dbName}`);
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await rootConnection.end();
  }

  const pool = await mysql.createPool({
    ...connectionConfig,
    database: dbName,
    connectionLimit: 5,
    queueLimit: 0,
  });

  try {
    console.log('Running database schema migration...');
    await runSqlFile(pool, path.join(__dirname, '..', 'database_schema.sql'));

    const fixMigrationPath = path.join(__dirname, '..', 'fix_missing_tables.sql');
    if (fs.existsSync(fixMigrationPath)) {
      console.log('Running supplemental migration file...');
      await runSqlFile(pool, fixMigrationPath);
    }

    await ensureDefaultRoles(pool);
    const roleId = await getRoleId(pool, 'Admin');
    if (!roleId) {
      throw new Error('Admin role was not created.');
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const [existingUsers] = await pool.query('SELECT id FROM tbl_users WHERE email = ? LIMIT 1', [adminEmail]);

    if (existingUsers.length > 0) {
      await pool.query(
        'UPDATE tbl_users SET username = ?, password = ?, first_name = ?, last_name = ?, role_id = ?, status = ? WHERE email = ?',
        [adminUsername, hashedPassword, 'Admin', 'User', roleId, 'active', adminEmail]
      );
      console.log(`Updated existing admin user: ${adminEmail}`);
    } else {
      await pool.query(
        'INSERT INTO tbl_users (username, email, password, first_name, last_name, role_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminUsername, adminEmail, hashedPassword, 'Admin', 'User', roleId, 'active']
      );
      console.log(`Created admin user: ${adminEmail}`);
    }

    console.log('Migration completed successfully.');
    console.log(`Login email: ${adminEmail}`);
    console.log('Login password: ' + adminPassword);
  } finally {
    await pool.end();
  }
}

async function runSqlFile(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement && !statement.startsWith('--'));

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error) {
      const message = (error.message || '').toLowerCase();
      const isSafeToIgnore =
        message.includes('already exists') ||
        message.includes('duplicate') ||
        message.includes('index exists') ||
        message.includes('key exists') ||
        message.includes('does not exist') ||
        message.includes('duplicate entry');

      if (!isSafeToIgnore) {
        throw error;
      }

      console.log(`Skipped existing object: ${statement.slice(0, 80)}...`);
    }
  }
}

async function ensureDefaultRoles(pool) {
  const roles = [
    ['Admin', 'Administrator role'],
    ['Editor', 'Editor role'],
    ['Reporter', 'Reporter role'],
    ['Author', 'Author role'],
    ['User', 'Default user role'],
  ];

  for (const [roleName, description] of roles) {
    await pool.query(
      'INSERT IGNORE INTO tbl_roles (role_name, description) VALUES (?, ?)',
      [roleName, description]
    );
  }
}

async function getRoleId(pool, roleName) {
  const [rows] = await pool.query('SELECT id FROM tbl_roles WHERE role_name = ? LIMIT 1', [roleName]);
  return rows[0]?.id || null;
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
