import ChatMessageService from "../services/chatMessage.service.js";
import { generateRoomId } from "../sockets/rooms.utils.js";
// List rooms for a user (buyer)
export const getUserRooms = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const rooms = await ChatMessageService.getUserRooms(userId, "user");
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// List rooms for a seller
export const getSellerRooms = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const rooms = await ChatMessageService.getUserRooms(sellerId, "seller");
    res.json({ success: true, rooms });
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

// Upload image for chat
export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    res.json({
      success: true,
      imageUrl: req.file.path,
      publicId: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



