
// utils/cookies.js
const isProd = process.env.NODE_ENV === "production";

// ⚠️ domain কখনোই third-party parent domain (যেমন .onrender.com) দিও না
// Render/Cloudflare-এ domain বাদ দিলেই ঠিকঠাক কাজ করে।
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? "None" : "Lax",
  secure: isProd, // production এ অবশ্যই true
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

module.exports = { cookieOptions, isProd };

