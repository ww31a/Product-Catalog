import chatMessageService from "../../services/chatMessage.service.js";
import { generateRoomId } from "../rooms.utils.js";
import { setupSupportHandlers } from "./support.handlers.js";

export const setupUserHandlers = (socket, io) => {
  const userId = socket.user.userId;

  socket.on("join_chat_room", async ({ sellerId }) => {
    try {
      const roomId = generateRoomId(userId, sellerId);
      socket.join(roomId);

      await chatMessageService.markAsRead(roomId, userId);
      const messages = await chatMessageService.findByRoomId(roomId);

      socket.emit("chat_history", { roomId, messages: messages.reverse() });
    } catch (error) {
      console.error("[join_chat_room] Error:", error.message);
      socket.emit("error_message", { message: error.message });
    }
  });

  socket.on("send_message", async ({ sellerId, message, imageUrl }) => {
    try {

      if (!message && !imageUrl) {
        return socket.emit("error_message", { message: "Message or image is required" });
      }

      const roomId = generateRoomId(userId, sellerId);

      const chatMessage = await chatMessageService.create({
        roomId,
        userId,
        sellerId,
        senderId: userId,
        senderRole: "user",
        message: message || null,
        image: imageUrl || null,
      });

      io.to(roomId).emit("new_message", { roomId, message: chatMessage });
      io.to(`user-${sellerId}`).emit("new_message_notification", {
        roomId,
        message: chatMessage,
      });
    } catch (error) {
      console.error("[send_message] Error:", error.message);
      socket.emit("error_message", { message: error.message });
    }
  });

  setupSupportHandlers(socket, io, userId);
};
