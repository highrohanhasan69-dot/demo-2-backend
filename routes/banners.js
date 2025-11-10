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
// 📸 MULTER MEMORY STORAGE
// -------------------------
const storage = multer.memoryStorage();
const uploadBanner = multer({ storage });

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
   ✅ 1️⃣ Get all banners
========================================================== */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM banners ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ GET /banners error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================================
   ✅ 2️⃣ Create new banner (image upload + DB insert)
========================================================== */
router.post("/", uploadBanner.single("image"), async (req, res) => {
  try {
    const { title, button_text, button_link } = req.body;
    if (!req.file) return res.status(400).json({ error: "Image required" });

    // ☁️ Upload to Cloudinary
    const image_url = await uploadToCloudinary(req.file.buffer, "urbilux/banners");

    const result = await pool.query(
      "INSERT INTO banners (title, image_url, button_text, button_link) VALUES ($1,$2,$3,$4) RETURNING *",
      [title, image_url, button_text, button_link]
    );

    res.json({
      message: "✅ Banner added successfully",
      banner: result.rows[0],
    });
  } catch (err) {
    console.error("❌ POST /banners error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ==========================================================
   ✅ 3️⃣ Update banner
========================================================== */
router.put("/:id", uploadBanner.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, button_text, button_link } = req.body;

    // Fetch old banner
    const oldData = await pool.query("SELECT * FROM banners WHERE id=$1", [id]);
    if (oldData.rows.length === 0)
      return res.status(404).json({ message: "Banner not found" });

    let image_url = oldData.rows[0].image_url;

    // ☁️ If new file uploaded → replace
    if (req.file) {
      image_url = await uploadToCloudinary(req.file.buffer, "urbilux/banners");
    }

    const updated = await pool.query(
      "UPDATE banners SET title=$1,image_url=$2,button_text=$3,button_link=$4 WHERE id=$5 RETURNING *",
      [title, image_url, button_text, button_link, id]
    );

    res.json({
      message: "✅ Banner updated successfully",
      banner: updated.rows[0],
    });
  } catch (err) {
    console.error("❌ PUT /banners error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ==========================================================
   ✅ 4️⃣ Delete banner
========================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const oldData = await pool.query("SELECT * FROM banners WHERE id=$1", [id]);
    if (oldData.rows.length === 0)
      return res.status(404).json({ message: "Banner not found" });

    await pool.query("DELETE FROM banners WHERE id=$1", [id]);
    res.json({ message: "🗑️ Banner deleted successfully" });
  } catch (err) {
    console.error("❌ DELETE /banners error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
