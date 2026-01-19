import AdminChatService from "../services/adminChat.service.js";

// Get all conversations for admin dashboard
export const getAdminConversations = async (req, res) => {
  try {
    const conversations = await AdminChatService.getAllConversationsWithDetails();
    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get conversation history
export const getConversationHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await AdminChatService.getConversationHistory(conversationId);
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

    res.json({ success: true, conversation });
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

// Upload image
export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    res.json({ success: true, imageUrl: req.file.path });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};