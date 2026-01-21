import multer from "multer";

// List of allowed MIME types
const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const chatUpload = multer({
  storage: multer.memoryStorage(), // store file in memory for processing
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true); // accept file
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images or PDFs are allowed.`));
    }
  },
});

export default chatUpload;
