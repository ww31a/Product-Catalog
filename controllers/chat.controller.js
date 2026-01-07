import ChatMessageService from "../services/chatMessage.service.js";
import { generateRoomId } from "../utils/socketHandler.js";

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

// Get history for a specific room (both buyer and seller can call)
export const getRoomHistory = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!roomId) return res.status(400).json({ success: false, message: "roomId is required" });

    const messages = await ChatMessageService.findByRoomId(roomId, 100);
    res.json({ success: true, messages: messages.reverse() });
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


