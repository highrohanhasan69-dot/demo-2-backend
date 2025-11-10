// routes/footer.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

// ---------------------
// ☁️ CLOUDINARY CONFIG
// ---------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------------
// 📦 MULTER MEMORY STORAGE (Fast upload)
// ---------------------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, SVG, or WEBP images are allowed!"));
  },
});

// ---------------------
// 🧩 Cloudinary Upload Helper
// ---------------------
const uploadToCloudinary = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "auto" },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload failed:", error.message);
            reject(error);
          } else {
            console.log("✅ Cloudinary upload success:", result.secure_url);
            resolve(result.secure_url);
          }
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    } catch (err) {
      console.error("❌ Streamifier error:", err.message);
      reject(err);
    }
  });
};

// ==================== SUPPORT ====================
router.get("/support", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM footer_support ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/support", async (req, res) => {
  const { label, value } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO footer_support (label, value) VALUES ($1,$2) RETURNING *",
      [label, value]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/support/:id", async (req, res) => {
  const { id } = req.params;
  const { label, value } = req.body;
  try {
    const result = await pool.query(
      "UPDATE footer_support SET label=$1, value=$2 WHERE id=$3 RETURNING *",
      [label, value, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/support/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM footer_support WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ABOUT US ====================
router.get("/about", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM footer_about ORDER BY column_order, id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/about", async (req, res) => {
  const { label, link, column_order } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO footer_about (label, link, column_order) VALUES ($1,$2,$3) RETURNING *",
      [label, link, column_order]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/about/:id", async (req, res) => {
  const { id } = req.params;
  const { label, link } = req.body;
  try {
    const result = await pool.query(
      "UPDATE footer_about SET label=$1, link=$2 WHERE id=$3 RETURNING *",
      [label, link, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/about/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM footer_about WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STAY CONNECTED ====================
router.get("/stay-connected", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM footer_stay_connected LIMIT 1");
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/stay-connected", async (req, res) => {
  const { name, address, email } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO footer_stay_connected (name, address, email) VALUES ($1,$2,$3) RETURNING *",
      [name, address, email]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/stay-connected/:id", async (req, res) => {
  const { id } = req.params;
  const { name, address, email } = req.body;
  try {
    const result = await pool.query(
      "UPDATE footer_stay_connected SET name=$1, address=$2, email=$3 WHERE id=$4 RETURNING *",
      [name, address, email, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== APP LINKS (CLOUDINARY) ====================
router.get("/app-links", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM footer_app_links ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/app-links", upload.single("icon"), async (req, res) => {
  try {
    const { link } = req.body;
    let iconUrl = null;

    if (req.file) {
      iconUrl = await uploadToCloudinary(req.file.buffer, "avado/footer/app-links");
    }

    const result = await pool.query(
      "INSERT INTO footer_app_links (link, icon) VALUES ($1,$2) RETURNING *",
      [link, iconUrl]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ APP LINK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/app-links/:id", upload.single("icon"), async (req, res) => {
  const { id } = req.params;
  const { link } = req.body;
  try {
    let iconUrl = null;
    if (req.file) {
      iconUrl = await uploadToCloudinary(req.file.buffer, "avado/footer/app-links");
    }

    const result = await pool.query(
      "UPDATE footer_app_links SET link=$1, icon=COALESCE($2,icon) WHERE id=$3 RETURNING *",
      [link, iconUrl, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/app-links/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM footer_app_links WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SOCIAL LINKS (CLOUDINARY) ====================
router.get("/social-links", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM footer_social_links ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/social-links", upload.single("icon"), async (req, res) => {
  try {
    const { link } = req.body;
    let iconUrl = null;

    if (req.file) {
      iconUrl = await uploadToCloudinary(req.file.buffer, "avado/footer/social-links");
    }

    const result = await pool.query(
      "INSERT INTO footer_social_links (link, icon) VALUES ($1,$2) RETURNING *",
      [link, iconUrl]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ SOCIAL LINK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/social-links/:id", upload.single("icon"), async (req, res) => {
  const { id } = req.params;
  const { link } = req.body;
  try {
    let iconUrl = null;
    if (req.file) {
      iconUrl = await uploadToCloudinary(req.file.buffer, "avado/footer/social-links");
    }

    const result = await pool.query(
      "UPDATE footer_social_links SET link=$1, icon=COALESCE($2,icon) WHERE id=$3 RETURNING *",
      [link, iconUrl, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/social-links/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM footer_social_links WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FOOTER TEXTS ====================
router.get("/texts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM footer_texts LIMIT 1");
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/texts", async (req, res) => {
  const { app_text, copyright, powered_by } = req.body;
  try {
    const check = await pool.query("SELECT id FROM footer_texts LIMIT 1");

    let result;
    if (check.rows.length > 0) {
      result = await pool.query(
        `UPDATE footer_texts SET app_text=$1, copyright=$2, powered_by=$3, updated_at=NOW()
         WHERE id=$4 RETURNING *`,
        [app_text, copyright, powered_by, check.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO footer_texts (app_text, copyright, powered_by)
         VALUES ($1,$2,$3) RETURNING *`,
        [app_text, copyright, powered_by]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ FOOTER TEXT UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
