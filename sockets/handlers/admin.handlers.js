import adminChatService from "../../services/adminChat.service.js";
import AdminConversation from "../../models/AdminConversation.module.js";
import { supportRoomId } from "../rooms.utils.js";

// Configuration
const MESSAGE_MAX_LENGTH = 5000; // characters

export const setupAdminHandlers = (socket, io) => {
  const adminId = socket.user.userId;

  socket.on("admin_join_conversation", async ({ conversationId }) => {
    try {
      const roomId = supportRoomId(conversationId);
      socket.join(roomId);

      await adminChatService.markAsRead(conversationId, adminId);
      const messages = await adminChatService.getConversationHistory(conversationId);

      socket.emit("chat_history", { conversationId, messages: messages.reverse() });
    } catch (error) {
      console.error("[admin_join_conversation] Error:", error.message);
      socket.emit("error_message", { message: error.message });
    }
  });

  socket.on("admin_send_message", async ({ conversationId, message, image, pdf }) => {
    try {
      const imageUrl = typeof image === 'string' ? image : image?.imageUrl;
      const pdfUrl = typeof pdf === 'string' ? pdf : pdf?.downloadUrl;

      if (!message && !imageUrl && !pdfUrl) {
        return socket.emit("error_message", { message: "Message, image, or PDF is required" });
      }

      // Message length validation
      if (message && message.length > MESSAGE_MAX_LENGTH) {
        return socket.emit("error_message", { 
          message: `Message too long. Maximum ${MESSAGE_MAX_LENGTH} characters allowed.`
        });
      }

      // Trim whitespace
      const trimmedMessage = message ? message.trim() : null;
      
      // Don't allow empty messages (only whitespace)
      if (message && !trimmedMessage) {
        return socket.emit("error_message", { 
          message: "Message cannot be empty" 
        });
      }

      const savedMessage = await adminChatService.sendMessage(
        conversationId,
        adminId,
        "SuperAdmin",
        trimmedMessage,
        imageUrl,
        pdfUrl
      );

      const roomId = supportRoomId(conversationId);
      io.to(roomId).emit("new_support_message", {
        conversationId,
        message: savedMessage,
      });

      const conv = await AdminConversation.findById(conversationId);
      if (conv?.participantId) {
        io.to(`user-${conv.participantId}`).emit("new_message_notification", {
          roomId,
          conversationId,
          message: savedMessage,
          isAdminChat: true,
        });
      }
    } catch (error) {
      console.error("[admin_send_message] Error:", error.message);
      socket.emit("error_message", { message: error.message });
    }
  });
};