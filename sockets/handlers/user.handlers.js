import chatMessageService from "../../services/chatMessage.service.js";
import { generateRoomId } from "../rooms.utils.js";
import { setupSupportHandlers } from "./support.handlers.js";

export const setupUserHandlers = (socket, io) => {
  const userId = socket.user.userId;

  socket.on("join_chat_room", async ({ sellerId }) => {
    const roomId = generateRoomId(userId, sellerId);
    socket.join(roomId);

    await chatMessageService.markAsRead(roomId, userId);
    const messages = await chatMessageService.findByRoomId(roomId);

    socket.emit("chat_history", { roomId, messages: messages.reverse() });
  });

  socket.on("send_message", async ({ sellerId, message, imageUrl }) => {
    const roomId = generateRoomId(userId, sellerId);

    const chatMessage = await chatMessageService.create({
      roomId,
      userId,
      sellerId,
      senderId: userId,
      senderRole: "user",
      message,
      image: imageUrl,
    });

    io.to(roomId).emit("new_message", { roomId, message: chatMessage });
    io.to(`user-${sellerId}`).emit("new_message_notification", {
      roomId,
      message: chatMessage,
    });
  });

  setupSupportHandlers(socket, io, userId);
};
