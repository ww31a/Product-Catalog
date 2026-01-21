import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const uploadBufferToCloudinary = (
  buffer, 
  folder = "chat-images", 
  resourceType = "image",
  options = {}
) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder, 
        resource_type: resourceType,
        ...options 
      },
      (err, result) => {
        if (err) {
          console.error("Cloudinary upload error:", err);
          reject(err);
        } else {
          console.log("Upload successful:", result.secure_url);
          resolve(result);
        }
      }
    );
    
    const stream = streamifier.createReadStream(buffer);
    
    stream.on('error', (error) => {
      console.error("Stream error:", error);
      reject(error);
    });
    
    stream.pipe(uploadStream);
  });
};