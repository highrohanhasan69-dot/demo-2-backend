// db.js
const { Pool } = require("pg");
require("dotenv").config();

// ✅ Neon + Render compatible pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required by Neon on Render
  },
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected successfully!");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL connection error:", err);
});

module.exports = pool;
