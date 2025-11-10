// routes/checkout.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getUserOrGuest } = require("../middleware/authMiddleware");

const JWT_SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === "production";

/* ===========================================================
   ✅ PLACE ORDER (Auto user create if guest)
=========================================================== */
router.post("/", getUserOrGuest, async (req, res) => {
  const { items, total, customer, payment_method } = req.body;

  if (!items || !total || !customer) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let userId = null;

    // 🔹 1️⃣ Check if user already logged in
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        console.log("⚠️ Invalid token, will create new user if needed...");
      }
    }

    // 🔹 2️⃣ If not logged in, create or find user by phone
    if (!userId && customer.phone) {
      const phone = customer.phone;
      const email = `${phone}@auto.avado.com`;
      const password = phone;

      const existingUser = await client.query(
        "SELECT id FROM users WHERE phone=$1",
        [phone]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log("🔁 Existing user found:", phone);
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await client.query(
          "INSERT INTO users (email, phone, password) VALUES ($1,$2,$3) RETURNING id",
          [email, phone, hashedPassword]
        );
        userId = newUser.rows[0].id;

        // 🔹 Set JWT Cookie for auto login (Render + Cloudflare compatible)
        const newToken = jwt.sign({ id: userId }, JWT_SECRET, {
          expiresIn: "7d",
        });

        res.cookie("token", newToken, {
          httpOnly: true,
          secure: true, // ✅ HTTPS only
          sameSite: "None", // ✅ Allow cross-domain cookie
          domain: "avado-backend.onrender.com", // ✅ Your backend domain
          path: "/", // ✅ Cookie available for all routes
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        console.log("✅ New user created & logged in:", phone);
      }
    }

    // 🔹 3️⃣ Price fix (with discount)
    const fixedItems = items.map((item) => {
      let price = Number(item.price);
      if (item.discount_percent) {
        price = price - (price * Number(item.discount_percent)) / 100;
      }
      return { ...item, price };
    });

    // 🔹 4️⃣ Insert order
    const insertQuery = `
      INSERT INTO orders (
        user_id, session_id, items, total, customer, payment_method, status, order_date, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING *;
    `;

    const order = await client.query(insertQuery, [
      userId,
      req.cartOwner?.id || null,
      JSON.stringify(fixedItems),
      total,
      JSON.stringify(customer),
      payment_method || "Cash on Delivery",
      "pending",
    ]);

    // 🔹 5️⃣ Clear cart (both user/guest)
    if (userId) {
      await client.query("DELETE FROM carts WHERE user_id=$1", [userId]);
    } else if (req.cartOwner?.id) {
      await client.query("DELETE FROM carts WHERE session_id=$1", [
        req.cartOwner.id,
      ]);
    }

    await client.query("COMMIT");
    console.log("✅ Order placed successfully:", order.rows[0].id);

    res.json({ success: true, order: order.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Checkout Error:", err);
    res
      .status(500)
      .json({ error: "Checkout failed", details: err.message });
  } finally {
    client.release();
  }
});

/* ===========================================================
   ✅ GET USER ORDERS (My Orders)
=========================================================== */
router.get("/", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
      [decoded.id]
    );

    const orders = result.rows.map((row) => ({
      ...row,
      items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
      customer:
        typeof row.customer === "string"
          ? JSON.parse(row.customer)
          : row.customer,
    }));

    res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ Fetch Orders Error:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/* ===========================================================
   ✅ ADMIN - GET ALL ORDERS
=========================================================== */
router.get("/admin/all", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );
    const orders = result.rows.map((row) => ({
      ...row,
      items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
      customer:
        typeof row.customer === "string"
          ? JSON.parse(row.customer)
          : row.customer,
    }));
    res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ Admin Get Orders Error:", err);
    res.status(500).json({ error: "Failed to fetch admin orders" });
  }
});

/* ===========================================================
   ✅ ADMIN - UPDATE ORDER STATUS
=========================================================== */
router.put("/admin/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });

  try {
    const result = await pool.query(
      "UPDATE orders SET status=$1 WHERE id=$2 RETURNING *",
      [status, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Order not found" });

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error("❌ Update Status Error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

module.exports = router;
