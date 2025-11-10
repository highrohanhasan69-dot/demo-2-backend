// routes/categories.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

// -------------------------
// ☁️ CLOUDINARY CONFIG
// -------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// -------------------------
// 📸 MULTER (Memory Storage)
// -------------------------
const storage = multer.memoryStorage();
const uploadCategory = multer({ storage });

// -------------------------
// 🔼 Helper: Upload to Cloudinary
// -------------------------
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

/* ==========================================================
   ✅ 1️⃣ সব ক্যাটাগরি পাওয়া (READ)
========================================================== */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ GET /categories error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================================
   ✅ 2️⃣ নতুন ক্যাটাগরি যোগ (CREATE)
========================================================== */
router.post("/", uploadCategory.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image required" });
    if (!req.body.slug) return res.status(400).json({ error: "Slug required" });

    // ☁️ Upload image to Cloudinary
    const image_url = await uploadToCloudinary(req.file.buffer, "avado/categories");
    const { slug } = req.body;

    const result = await pool.query(
      "INSERT INTO categories (image_url, slug) VALUES ($1, $2) RETURNING *",
      [image_url, slug]
    );

    res.json({
      message: "✅ Category added successfully",
      category: result.rows[0],
    });
  } catch (err) {
    console.error("❌ POST /categories error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ==========================================================
   ✅ 3️⃣ নির্দিষ্ট ক্যাটাগরি আপডেট করা (UPDATE)
========================================================== */
router.put("/:id", uploadCategory.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { slug } = req.body;

    // পুরনো ডাটা বের করা
    const oldData = await pool.query("SELECT * FROM categories WHERE id=$1", [id]);
    if (oldData.rows.length === 0)
      return res.status(404).json({ message: "Category not found" });

    let image_url = oldData.rows[0].image_url;

    // ☁️ যদি নতুন ছবি upload করা হয়, Cloudinary তে আপলোড করো
    if (req.file) {
      image_url = await uploadToCloudinary(req.file.buffer, "avado/categories");
    }

    const updated = await pool.query(
      "UPDATE categories SET slug=$1, image_url=$2 WHERE id=$3 RETURNING *",
      [slug || oldData.rows[0].slug, image_url, id]
    );

    res.json({
      message: "✅ Category updated successfully",
      category: updated.rows[0],
    });
  } catch (err) {
    console.error("❌ PUT /categories error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ==========================================================
   ✅ 4️⃣ ক্যাটাগরি ডিলিট করা (DELETE)
========================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // পুরনো ডাটা বের করো
    const oldData = await pool.query("SELECT * FROM categories WHERE id=$1", [id]);
    if (oldData.rows.length === 0)
      return res.status(404).json({ message: "Category not found" });

    // Cloudinary তে image delete করার দরকার নেই (optional)
    await pool.query("DELETE FROM categories WHERE id=$1", [id]);

    res.json({ message: "🗑️ Category deleted successfully" });
  } catch (err) {
    console.error("❌ DELETE /categories error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
