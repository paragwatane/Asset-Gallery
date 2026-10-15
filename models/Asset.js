const mongoose = require("mongoose");

const CATEGORIES = [
  "Character",
  "Environment",
  "Prop",
  "Vehicle",
  "Weapon",
  "Architecture",
  "Other",
];

// MongoDB stores only the *metadata* and the file names.
// The actual image and model files live on disk in /uploads.
const assetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title can be at most 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description can be at most 2000 characters"],
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: CATEGORIES,
        message: "Category must be one of: " + CATEGORIES.join(", "),
      },
    },
    software: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },
    polyCount: {
      type: Number,
      min: [0, "Poly count cannot be negative"],
      default: null,
    },

    image: { type: String, default: null }, // stored file name of the thumbnail
    modelFile: { type: String, default: null }, // stored file name of the 3D file
    modelName: { type: String, default: null }, // original name, used for the download
    modelSize: { type: Number, default: null }, // bytes
  },
  { timestamps: true }
);

module.exports = mongoose.model("Asset", assetSchema);
