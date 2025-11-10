// routes/stats.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

/* ===========================================================
   ✅ DASHBOARD OVERVIEW (Total Orders, Revenue, Profit etc.)
=========================================================== */
router.get("/overview", async (req, res) => {
  try {
    // ---------- Total Orders ----------
    const totalOrdersResult = await pool.query("SELECT COUNT(*) FROM orders");
    const totalOrders = Number(totalOrdersResult.rows[0].count || 0);

    // ---------- Pending Orders ----------
    const pendingResult = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status='pending'"
    );
    const pendingOrders = Number(pendingResult.rows[0].count || 0);

    // ---------- Delivered Orders ----------
    const deliveredResult = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status='delivered'"
    );
    const deliveredOrders = Number(deliveredResult.rows[0].count || 0);

    // ---------- Total Revenue ----------
    const revenueResult = await pool.query(
      "SELECT COALESCE(SUM(total),0) AS total_revenue FROM orders WHERE status='delivered'"
    );
    const totalRevenue = Number(revenueResult.rows[0].total_revenue || 0);

    // ---------- Profit Calculation ----------
    // যদি products টেবিলে product এর cost_price থাকে
    // তাহলে totalProfit বের করতে নিচের logic use করবো
    let totalProfit = 0;

    const profitResult = await pool.query(`
      SELECT 
        SUM(
          (oi->>'price')::numeric - COALESCE((oi->>'cost')::numeric, 0)
        ) AS profit
      FROM (
        SELECT jsonb_array_elements(items) AS oi 
        FROM orders WHERE status='delivered'
      ) x
    `);

    totalProfit = Number(profitResult.rows[0].profit || 0);

    // ---------- Monthly Sales ----------
    const monthlyResult = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon') AS month,
        SUM(total) AS total
      FROM orders
      WHERE status='delivered'
      GROUP BY month, date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at)
      LIMIT 6;
    `);

    const monthlySales = monthlyResult.rows.map((r) => ({
      month: r.month,
      total: Number(r.total),
    }));

    // ---------- Recent Orders ----------
    const recentResult = await pool.query(`
      SELECT id, total, status, created_at, customer
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10;
    `);

    const recentOrders = recentResult.rows.map((o) => ({
      ...o,
      customer:
        typeof o.customer === "string"
          ? JSON.parse(o.customer)
          : o.customer || {},
    }));

    // ---------- Top Selling Products ----------
    const topProductsResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.image_url,
        COUNT(*) AS sold_count,
        SUM((oi->>'price')::numeric) AS revenue
      FROM orders o,
        jsonb_array_elements(o.items) AS oi
        JOIN products p ON p.id = (oi->>'product_id')::int
      WHERE o.status='delivered'
      GROUP BY p.id, p.name, p.image_url
      ORDER BY revenue DESC
      LIMIT 5;
    `);

    const topProducts = topProductsResult.rows.map((r) => ({
      ...r,
      sold_count: Number(r.sold_count),
      revenue: Number(r.revenue),
    }));

    // ✅ Send Response
    res.json({
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue,
      totalProfit,
      monthlySales,
      recentOrders,
      topProducts,
    });
  } catch (err) {
    console.error("❌ /api/stats/overview error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;
