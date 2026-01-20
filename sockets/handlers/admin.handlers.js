import adminChatService from "../../services/adminChat.service.js";
import AdminConversation from "../../models/AdminConversation.module.js";
import { supportRoomId } from "../rooms.utils.js";

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

  socket.on("admin_send_message", async ({ conversationId, message, imageUrl }) => {
    try {
      const savedMessage = await adminChatService.sendMessage(
        conversationId,
        adminId,
        "SuperAdmin",
        message,
        imageUrl
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
