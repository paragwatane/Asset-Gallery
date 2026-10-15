const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const IMAGE_DIR = path.join(__dirname, "..", "uploads", "images");
const MODEL_DIR = path.join(__dirname, "..", "uploads", "models");

// Create the folders on first run
[IMAGE_DIR, MODEL_DIR].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MODEL_EXT = [".fbx", ".obj", ".glb", ".gltf", ".blend", ".zip"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const storage = multer.diskStorage({
  // The form field name decides the folder: "image" -> images, "model" -> models
  destination: (req, file, cb) =>
    cb(null, file.fieldname === "image" ? IMAGE_DIR : MODEL_DIR),

  // Never trust the uploaded name: generate our own unique one
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isImage = file.fieldname === "image";
  const allowed = isImage ? IMAGE_EXT : MODEL_EXT;

  if (!allowed.includes(ext)) {
    const err = new Error(
      `${isImage ? "Image" : "Model"} must be one of: ${allowed.join(", ")}`
    );
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

module.exports = {
  // Accepts one file in "image" and one in "model" per request
  upload: upload.fields([
    { name: "image", maxCount: 1 },
    { name: "model", maxCount: 1 },
  ]),
  IMAGE_DIR,
  MODEL_DIR,
};
