import adminChatService from "../../services/adminChat.service.js";
import AdminConversation from "../../models/AdminConversation.module.js";
import { supportRoomId } from "../rooms.utils.js";

export const setupSupportHandlers = (socket, io, userId) => {
  socket.on("join_support_room", async ({ conversationId }) => {
    try {
      if (!conversationId) return;

      const conversation = await AdminConversation.findById(conversationId).populate("participantId");
      if (!conversation || conversation.participantId.userId.toString() !== userId.toString()) {
        return socket.emit("error_message", { message: "Unauthorized access to this conversation" });
      }

      const roomId = supportRoomId(conversationId);
      socket.join(roomId);

      await adminChatService.markAsRead(conversationId, userId);

      const messages = await adminChatService.getConversationHistory(conversationId);
      socket.emit("chat_history", { roomId, messages: messages.reverse() });
      
    } catch (error) {
      console.error("[join_support_room] Error:", error.message);
      socket.emit("error_message", { message: error.message });
    }
  });

  socket.on("send_support_reply", async ({ conversationId, message, imageUrl }) => {
    try {
      if (!conversationId || !message) return;

      const conversation = await AdminConversation.findById(conversationId).populate("participantId");
      if (!conversation || conversation.participantId.userId.toString() !== userId.toString()) {
        return socket.emit("error_message", { message: "Unauthorized access to this conversation" });
      }

      const senderModel = socket.user.role === "user" ? "User" : "Seller";

      const savedMessage = await adminChatService.sendMessage(
        conversationId,
        userId,
        senderModel,
        message,
        imageUrl
      );

      const roomId = supportRoomId(conversationId);
      io.to(roomId).emit("new_support_message", {
        conversationId,
        message: savedMessage,
      });

      if (conversation?.adminId) {
        io.to(`user-${conversation.adminId}`).emit("new_message_notification", {
          roomId,
          conversationId,
          message: savedMessage,
          isAdminChat: true,
        });
      }
    } catch (error) {
      console.error("[send_support_reply] Error:", error.message);
      socket.emit("error_message", { message: error.message });
    }
  });
};
