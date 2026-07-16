#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

const EXPECTED_TABLES = [
  'tbl_roles',
  'tbl_users',
  'tbl_permissions',
  'tbl_role_permissions',
  'tbl_categories',
  'tbl_sub_categories',
  'tbl_articles',
  'tbl_tags',
  'tbl_article_tags',
  'tbl_comments',
  'tbl_gallery',
  'tbl_videos',
  'tbl_newsletter_subscribers',
  'tbl_related_articles',
  'tbl_sitemap_log',
  'tbl_activity_logs',
  'tbl_banners',
  'tbl_article_analytics',
];

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote && next === "'") {
        current += char;
        current += next;
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
        current += char;
      }
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      if (inDoubleQuote && next === '"') {
        current += char;
        current += next;
        i += 1;
      } else {
        inDoubleQuote = !inDoubleQuote;
        current += char;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === ';') {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements.filter((statement) => statement && !statement.startsWith('--'));
}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbName = process.env.DB_NAME;
const adminEmail = process.env.ADMIN_EMAIL || 'admin@beannews.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Deepak@12345';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';

if (!dbName) {
  console.error('DB_NAME is not set. Please configure backend/.env first.');
  process.exit(1);
}

function buildConnectionConfig() {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    multipleStatements: false,
  };

  if (config.host && config.host.includes('rds.amazonaws.com')) {
    const sslPath = path.resolve(__dirname, '..', 'global-bundle.pem');
    if (fs.existsSync(sslPath)) {
      config.ssl = {
        rejectUnauthorized: false,
        ca: fs.readFileSync(sslPath),
      };
      console.log('Using SSL for RDS connection.');
    }
  }

  return config;
}

async function main() {
  const connectionConfig = buildConnectionConfig();

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
    const schemaFailures = await runSqlFile(pool, path.join(__dirname, '..', 'database_schema.sql'));

    const fixMigrationPath = path.join(__dirname, '..', 'fix_missing_tables.sql');
    let supplementalFailures = [];
    if (fs.existsSync(fixMigrationPath)) {
      console.log('Running supplemental migration file...');
      supplementalFailures = await runSqlFile(pool, fixMigrationPath);
    }

    const allFailures = [...schemaFailures, ...supplementalFailures];
    if (allFailures.length > 0) {
      console.error(`\n${allFailures.length} statement(s) failed during migration:`);
      for (const failure of allFailures) {
        console.error(`  - ${failure.statement.slice(0, 100).replace(/\s+/g, ' ')}...`);
        console.error(`    -> ${failure.error}`);
      }
    }

    const { missing, present } = await verifyTables(pool);
    console.log(`\nTable check: ${present.length}/${EXPECTED_TABLES.length} expected tables present.`);
    if (missing.length > 0) {
      console.error(`Missing tables: ${missing.join(', ')}`);
    }

    if (!present.includes('tbl_roles') || !present.includes('tbl_users')) {
      throw new Error('Core tables (tbl_roles / tbl_users) are missing. Cannot seed admin. Check the errors above.');
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

    if (allFailures.length > 0 || missing.length > 0) {
      console.error('\nMigration finished with errors — see above. Admin user was still seeded.');
      process.exitCode = 1;
    } else {
      console.log('\nMigration completed successfully. All tables present.');
    }
    console.log(`Login email: ${adminEmail}`);
    console.log('Login password: ' + adminPassword);
  } finally {
    await pool.end();
  }
}

async function runSqlFile(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = splitSqlStatements(sql);
  const failures = [];

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
        message.includes('duplicate entry') ||
        message.includes('table exists');

      if (isSafeToIgnore) {
        console.log(`Skipped existing object: ${statement.slice(0, 80)}...`);
        continue;
      }

      // Don't let one bad statement stop the rest of the tables from being created.
      console.error(`Statement failed, continuing with the rest: ${statement.slice(0, 80)}...`);
      console.error(`  -> ${error.message}`);
      failures.push({ statement, error: error.message });
    }
  }

  return failures;
}

async function verifyTables(pool) {
  const [rows] = await pool.query(
    'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [dbName]
  );
  const present = new Set(rows.map((row) => row.name));
  const missing = EXPECTED_TABLES.filter((table) => !present.has(table));
  return { missing, present: EXPECTED_TABLES.filter((table) => present.has(table)) };
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
