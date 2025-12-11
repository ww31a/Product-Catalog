import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only images or PDF files are allowed"));
};


const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "product_catalog",
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

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export default upload;
