const mysql = require("mysql2/promise");
require("dotenv").config({ path: "./.env" });
const path = require("path");
const fs = require("fs");

async function migrate() {
    const config = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    };

    if (config.host.includes("rds.amazonaws.com")) {
        const sslPath = path.resolve(__dirname, "../global-bundle.pem");
        if (fs.existsSync(sslPath)) {
            config.ssl = {
                rejectUnauthorized: false,
                ca: fs.readFileSync(sslPath)
            };
        }
    }

    try {
        const connection = await mysql.createConnection(config);
        console.log("Connected to database.");

        await connection.execute("ALTER TABLE tbl_comments MODIFY user_id INT NULL");
        console.log("ALTER TABLE tbl_comments SUCCESS: user_id is now nullable.");

        await connection.end();
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
