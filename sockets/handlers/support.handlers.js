import adminChatService from "../../services/adminChat.service.js";
import AdminConversation from "../../models/AdminConversation.module.js";
import { supportRoomId } from "../rooms.utils.js";

export const setupSupportHandlers = (socket, io, userId) => {
  socket.on("join_support_room", async ({ conversationId }) => {
    if (!conversationId) return;

    const roomId = supportRoomId(conversationId);
    socket.join(roomId);

    await adminChatService.markAsRead(conversationId, userId);

    const messages = await adminChatService.getConversationHistory(conversationId);
    socket.emit("chat_history", { roomId, messages: messages.reverse() });
  });

  socket.on("send_support_reply", async ({ conversationId, message, imageUrl }) => {
    if (!conversationId || (!message && !imageUrl)) return;

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

    const conversation = await AdminConversation.findById(conversationId);
    if (conversation?.adminId) {
      io.to(`user-${conversation.adminId}`).emit("new_message_notification", {
        roomId,
        conversationId,
        message: savedMessage,
        isAdminChat: true,
      });
    }
  });
};
