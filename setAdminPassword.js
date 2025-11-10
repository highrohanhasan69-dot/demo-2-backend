// setAdminPassword.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./db");

async function setAdminPassword() {
  const email = "adminhigh@gmail.com"; // তোমার admin email
  const plainPassword = "YourNewAdminPassword123"; // এখানে নতুন পাসওয়ার্ড দাও

  try {
    const hashed = await bcrypt.hash(plainPassword, 10);

    await pool.query("UPDATE users SET password = $1 WHERE email = $2", [
      hashed,
      email,
    ]);

    console.log(`✅ Admin password updated successfully for ${email}`);
  } catch (err) {
    console.error("❌ Failed to update password:", err);
  } finally {
    pool.end();
  }
}

setAdminPassword();
