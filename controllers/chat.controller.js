import ChatMessageService from "../services/chatMessage.service.js";
import AdminChatService from "../services/adminChat.service.js";
import User from "../models/user.module.js";
import Seller from "../models/seller.module.js";
import { generateRoomId } from "../sockets/rooms.utils.js";
import sharp from "sharp";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import cloudinary from "../config/cloudinary.js";
import { logActivity, logError } from "../utils/logger.js";

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
    logError({
      error: err,
      context: "Get User Chat Rooms",
      metadata: {
        userId: req.auth.userId,
        requestId: req.requestId
      }
    });

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
    logError({
      error: err,
      context: "Get Seller Chat Rooms",
      metadata: {
        sellerId: req.auth.userId,
        requestId: req.requestId
      }
    });

    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper to build room id (for clients that want to compute server-side)
export const getRoomId = async (req, res) => {
  const { userId, sellerId } = req.query;

  if (!userId || !sellerId) {
    return res.status(400).json({
      success: false,
      message: "userId and sellerId are required"
    });
  }

  return res.json({
    success: true,
    roomId: generateRoomId(userId, sellerId)
  });
};

export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided"
      });
    }

    let result;
    let type;
    let finalUrl;

    // IMAGE
    if (req.file.mimetype.startsWith("image/")) {
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
    }

    // PDF
    else if (req.file.mimetype === "application/pdf") {
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

      type = "pdf";
      finalUrl = result.secure_url;
    }

    // UNSUPPORTED
    else {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type"
      });
    }

    res.json({
      success: true,
      downloadUrl: finalUrl,
      imageUrl: type === "image" ? finalUrl : null,
      type,
      publicId: result.public_id
    });

  } catch (error) {
    logError({
      error,
      context: "Upload Chat File",
      metadata: {
        requestId: req.requestId,
        mimetype: req.file?.mimetype
      }
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
