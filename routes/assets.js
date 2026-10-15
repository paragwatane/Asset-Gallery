const express = require("express");
const fs = require("fs");
const path = require("path");
const Asset = require("../models/Asset");
const { upload, IMAGE_DIR, MODEL_DIR } = require("../middleware/upload");

const router = express.Router();

// ---------- helpers ----------
function removeFile(dir, name) {
  if (name) fs.unlink(path.join(dir, name), () => {}); // ignore "already gone" errors
}

// If saving to the database fails, don't leave orphan files on disk
function cleanupUploads(files = {}) {
  removeFile(IMAGE_DIR, files.image?.[0]?.filename);
  removeFile(MODEL_DIR, files.model?.[0]?.filename);
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Text fields arrive as strings in multipart forms, so convert them here
function buildFields(body = {}) {
  const fields = {};
  ["title", "description", "category", "software"].forEach((key) => {
    if (body[key] !== undefined) fields[key] = body[key];
  });
  if (body.polyCount !== undefined) {
    fields.polyCount = body.polyCount === "" ? null : Number(body.polyCount);
  }
  if (body.tags !== undefined) {
    fields.tags = String(body.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return fields;
}

function handleError(err, res) {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: "Validation failed", errors: messages });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid asset id" });
  }
  console.error(err);
  return res.status(500).json({ message: "Server error" });
}

// ---------- CREATE  ->  POST /api/assets ----------
router.post("/", upload, async (req, res) => {
  const files = req.files || {};
  const image = files.image?.[0];
  const model = files.model?.[0];
  try {
    const asset = await Asset.create({
      ...buildFields(req.body),
      image: image?.filename || null,
      modelFile: model?.filename || null,
      modelName: model?.originalname || null,
      modelSize: model?.size || null,
    });
    res.status(201).json(asset);
  } catch (err) {
    cleanupUploads(files);
    handleError(err, res);
  }
});

// ---------- READ ALL  ->  GET /api/assets?search=&category= ----------
router.get("/", async (req, res) => {
  try {
    const filter = {};
    const category = typeof req.query.category === "string" ? req.query.category : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    if (category && category !== "All") filter.category = category;
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: rx }, { description: rx }, { tags: rx }, { software: rx }];
    }

    const assets = await Asset.find(filter).sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    handleError(err, res);
  }
});

// ---------- READ ONE  ->  GET /api/assets/:id ----------
router.get("/:id", async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  } catch (err) {
    handleError(err, res);
  }
});

// ---------- DOWNLOAD MODEL  ->  GET /api/assets/:id/download ----------
router.get("/:id/download", async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset || !asset.modelFile) {
      return res.status(404).json({ message: "No model file for this asset" });
    }
    // Sends the file with its original name (e.g. "robot.fbx")
    res.download(path.join(MODEL_DIR, asset.modelFile), asset.modelName || asset.modelFile, (err) => {
      if (err && !res.headersSent) res.status(404).json({ message: "File missing on server" });
    });
  } catch (err) {
    handleError(err, res);
  }
});

// ---------- UPDATE  ->  PUT /api/assets/:id ----------
router.put("/:id", upload, async (req, res) => {
  const files = req.files || {};
  const newImage = files.image?.[0];
  const newModel = files.model?.[0];
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      cleanupUploads(files);
      return res.status(404).json({ message: "Asset not found" });
    }

    const oldImage = asset.image;
    const oldModel = asset.modelFile;

    asset.set(buildFields(req.body));
    if (newImage) asset.image = newImage.filename;
    if (newModel) {
      asset.modelFile = newModel.filename;
      asset.modelName = newModel.originalname;
      asset.modelSize = newModel.size;
    }

    await asset.save(); // runs all schema validators

    // Only delete the replaced files after the save succeeded
    if (newImage) removeFile(IMAGE_DIR, oldImage);
    if (newModel) removeFile(MODEL_DIR, oldModel);

    res.json(asset);
  } catch (err) {
    cleanupUploads(files);
    handleError(err, res);
  }
});

// ---------- DELETE  ->  DELETE /api/assets/:id ----------
router.delete("/:id", async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    removeFile(IMAGE_DIR, asset.image);
    removeFile(MODEL_DIR, asset.modelFile);

    res.json({ message: "Asset deleted", asset });
  } catch (err) {
    handleError(err, res);
  }
});

module.exports = router;
