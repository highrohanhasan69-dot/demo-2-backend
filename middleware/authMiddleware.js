// middleware/authMiddleware.js
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET;

// 🌐 Auto-detect environment for cookie options
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? "None" : "Lax", // ✅ Cloudflare-friendly
  secure: isProd,                    // ✅ required for HTTPS cookies
  maxAge: 1000 * 60 * 60 * 24 * 30,  // 30 days
};

/* ==========================================================
   ✅ Logged-in User বা Guest চিনে ফেলার Middleware
========================================================== */
const getUserOrGuest = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    // ✅ Logged-in user (has JWT token)
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userRes = await db.query("SELECT id FROM users WHERE id=$1", [decoded.id]);

      if (userRes.rows.length) {
        req.user = { id: userRes.rows[0].id, role: decoded.role };
        req.cartOwner = { type: "user", id: req.user.id };
        return next();
      }
    }

    // ✅ Otherwise treat as guest
    let guestId = req.cookies?.guest_session;

    // create guest cookie if missing
    if (!guestId) {
      guestId =
        "guest_" + crypto.randomBytes(12).toString("hex") + Date.now().toString(36);
      res.cookie("guest_session", guestId, cookieOptions);
      console.log("🆕 New guest session created:", guestId);
    }

    req.cartOwner = { type: "guest", id: guestId };
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);

    // fallback to guest if token invalid
    let fallbackId = req.cookies?.guest_session;
    if (!fallbackId) {
      fallbackId =
        "guest_" + crypto.randomBytes(12).toString("hex") + Date.now().toString(36);
      res.cookie("guest_session", fallbackId, cookieOptions);
    }
    req.cartOwner = { type: "guest", id: fallbackId };
    next();
  }
};

/* ==========================================================
   ✅ শুধুমাত্র Admin এর জন্য Access Control Middleware
========================================================== */
const adminOnly = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized: No token found" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 🔍 Check role from token
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    // Attach user info for next middleware
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { getUserOrGuest, adminOnly };