require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const assetRoutes = require("./routes/assets");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// The frontend (public/index.html) is served by Express itself,
// so the page and the API share one origin and need no CORS setup.
app.use(express.static(path.join(__dirname, "public")));

// Thumbnails are public. Model files are NOT served statically;
// they go through the /download route instead.
app.use("/uploads/images", express.static(path.join(__dirname, "uploads", "images")));

app.use("/api/assets", assetRoutes);

// Unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Central error handler: upload problems and bad JSON become clean JSON replies
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File too large (max 100 MB)" : err.message;
    return res.status(400).json({ message });
  }
  if (err.status === 400 || err.type === "entity.parse.failed") {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Open http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
