import AdminChatService from "../services/adminChat.service.js";
import AdminConversation from "../models/AdminConversation.module.js";

// Get all conversations for admin
export const getAdminConversations = async (req, res) => {
  try {
    const conversations = await AdminConversation.find()
      .populate({
        path: "participantId",
        populate: {
          path: "userId",
          select: "name email roles"
        }
      })
      .populate("adminId", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await AdminChatService.getConversationHistory(conv._id);

        const unreadCount = messages.filter(
          m => !m.read && m.senderModel !== "SuperAdmin"
        ).length;

        const lastMessage =
          messages.length > 0
            ? messages[messages.length - 1].message
            : null;

        return {
          ...conv,
          unreadCount,
          lastMessage
        };
      })
    );

    res.json({ success: true, conversations: conversationsWithDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Get conversation history
export const getConversationHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await AdminChatService.getConversationHistory(conversationId);

    // Mark as read
    await AdminChatService.markAsRead(conversationId, req.auth.userId);

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start new conversation
export const startConversation = async (req, res) => {
  try {
    const { participantId, participantModel } = req.body;

    if (!participantId || !participantModel) {
      return res.status(400).json({
        success: false,
        message: "participantId and participantModel are required"
      });
    }

    const conversation = await AdminChatService.startConversation(
      req.auth.userId,
      participantId,
      participantModel
    );

    const populatedConversation = await AdminConversation.findById(conversation._id)
      .populate("participantId")
      .populate("adminId", "name email");

    res.json({ success: true, conversation: populatedConversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Close conversation
export const closeConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await AdminChatService.closeConversation(conversationId);
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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