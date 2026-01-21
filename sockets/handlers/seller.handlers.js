import chatMessageService from "../../services/chatMessage.service.js";
import { generateRoomId } from "../rooms.utils.js";
import { setupSupportHandlers } from "./support.handlers.js";

export const setupSellerHandlers = (socket, io) => {
  const sellerId = socket.user.userId;

  socket.on("join_seller_chat_room", async ({ targetUserId }) => {
    try {
      const roomId = generateRoomId(targetUserId, sellerId);
      socket.join(roomId);

      await chatMessageService.markAsRead(roomId, sellerId);
      const messages = await chatMessageService.findByRoomId(roomId);

      socket.emit("chat_history", { roomId, messages: messages.reverse() });

    } catch (error) {
      console.error("[join_seller_chat_room] Error:", error.message);
      socket.emit("error_message", { message: error.message });
    }
  });

  socket.on("send_seller_message", async ({ targetUserId, message, image, pdf }) => {
    try {
      const roomId = generateRoomId(targetUserId, sellerId);

      const imageUrl = typeof image === 'string' ? image : image?.imageUrl;
      const pdfUrl = typeof pdf === 'string' ? pdf : pdf?.downloadUrl;

      if (!message && !imageUrl && !pdfUrl) {
        return socket.emit("error_message", { message: "Message, image, or PDF is required" });
      }

      const chatMessage = await chatMessageService.create({
        roomId,
        userId: targetUserId,
        sellerId,
        senderId: sellerId,
        senderRole: "seller",
        message: message || null,
        image: imageUrl || null,
        pdf: pdfUrl || null,
      });

      io.to(roomId).emit("new_message", { roomId, message: chatMessage });
      io.to(`user-${targetUserId}`).emit("new_message_notification", {
        roomId,
        message: chatMessage,
      });

    } catch (error) {
      console.error("[send_seller_message] Error:", error.message);
      socket.emit("error_message", { message: error.message });
    }
  });

  setupSupportHandlers(socket, io, sellerId);
};
