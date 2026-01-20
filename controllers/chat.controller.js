import ChatMessageService from "../services/chatMessage.service.js";
import AdminChatService from "../services/adminChat.service.js";
import User from "../models/user.module.js";
import Seller from "../models/seller.module.js";
import { generateRoomId } from "../sockets/rooms.utils.js";
import sharp from "sharp";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import cloudinary from "../config/cloudinary.js";


// List rooms for a user (buyer)
export const getUserRooms = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const rooms = await ChatMessageService.getUserRooms(userId, "user");

    // Fetch support chats
    const userDoc = await User.findOne({ userId });
    let supportRooms = [];
    if (userDoc) {
      supportRooms = await AdminChatService.getParticipantConversations(userDoc._id);
    }

    // Merge and sort
    const allRooms = [...rooms, ...supportRooms].sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    res.json({ success: true, rooms: allRooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// List rooms for a seller
export const getSellerRooms = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const rooms = await ChatMessageService.getUserRooms(sellerId, "seller");

    // Fetch support chats
    const sellerDoc = await Seller.findOne({ userId: sellerId });
    let supportRooms = [];
    if (sellerDoc) {
      supportRooms = await AdminChatService.getParticipantConversations(sellerDoc._id);
    }

    // Merge and sort
    const allRooms = [...rooms, ...supportRooms].sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    res.json({ success: true, rooms: allRooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper to build room id (for clients that want to compute server-side)
export const getRoomId = async (req, res) => {
  const { userId, sellerId } = req.query;
  if (!userId || !sellerId) {
    return res.status(400).json({ success: false, message: "userId and sellerId are required" });
  }
  return res.json({ success: true, roomId: generateRoomId(userId, sellerId) });
};

export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    console.log("File received:", {
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    });

    let result;
    let type;
    let finalUrl;
    let previewUrl;

    if (req.file.mimetype.startsWith("image/")) {
      // Compress images
      const compressedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1280, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      result = await uploadBufferToCloudinary(
        compressedBuffer, 
        "chat-files",
        "image"
      );
      type = "image";
      finalUrl = result.secure_url;
      
    } else if (req.file.mimetype === "application/pdf") {
      // Upload PDF as RAW for download
      const timestamp = Date.now();
      const filename = req.file.originalname.replace(/\.[^/.]+$/, "");
      
      result = await uploadBufferToCloudinary(
        req.file.buffer, 
        "chat-files",
        "raw",
        { 
          public_id: `${timestamp}_${filename}`,
          resource_type: "raw"
        }
      );
      
      // Also upload as image type for preview (first page)
      const previewResult = await uploadBufferToCloudinary(
        req.file.buffer, 
        "chat-files",
        "image",
        { 
          public_id: `${timestamp}_${filename}_preview`
        }
      );
      
      // Generate PNG preview of first page
      previewUrl = cloudinary.url(previewResult.public_id, {
        resource_type: 'image',
        format: 'png',
        page: 1,
        secure: true
      });
      
      console.log("Cloudinary result:", result);
      console.log("Preview URL:", previewUrl);
      
      finalUrl = result.secure_url;  // Raw PDF for download
      type = "pdf";
      
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Unsupported file type" 
      });
    }

    res.json({
      success: true,
      downloadUrl: finalUrl,  // For images and PDF downloads
      imageUrl: previewUrl || finalUrl,  // PNG preview for PDFs, same as imageUrl for images
      type,
      publicId: result.public_id,
    });

  } catch (error) {
    console.error("[uploadChatFile] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};