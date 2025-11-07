import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "product_catalog",
    upload_preset: "webwritecatalog",
    format: async (req, file) => {
      const mimeMap = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      return mimeMap[file.mimetype] || "jpg";
    },
    public_id: (req, file) => `${Date.now()}_${file.originalname}`,
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

export default upload;
