import jwt from "jsonwebtoken";
import ChatMessageService from "../services/chatMessage.service.js";

/**
 * Generate room ID for user-seller chat
 * Format: user-{userId}-seller-{sellerId}
 * This ensures all products from the same seller go to the same room
 */
export const generateRoomId = (userId, sellerId) => {
    return `user-${userId}-seller-${sellerId}`;
};

/**
 * Initialize Socket.IO handlers for chat functionality
 */
export const initializeSocketHandlers = (io) => {
    // Authentication middleware
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || 
                         socket.handshake.headers?.authorization?.split(" ")[1];
            
            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            socket.user = {
                userId: decoded.id,
                role: decoded.role,
                roles: decoded.roles || [decoded.role]
            };

            next();
        } catch (err) {
            console.error("Socket auth error:", err.message);
            next(new Error("Authentication error: Invalid or expired token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.user.userId;
        const userRole = socket.user.role;
        
        console.log(`User connected: ${userId} (${userRole})`);

        // Join user's personal room for notifications
        socket.join(`user-${userId}`);

        // ========== USER HANDLERS ==========
        if (userRole === "user") {
            // Handle joining a chat room with a seller
            socket.on("join_chat_room", async ({ sellerId }) => {
                if (!sellerId) {
                    socket.emit("error", { message: "sellerId is required" });
                    return;
                }

                const roomId = generateRoomId(userId, sellerId);
                socket.join(roomId);
                
                // Mark messages as read when user joins
                await ChatMessageService.markAsRead(roomId, userId);
                
                // Send chat history
                const messages = await ChatMessageService.findByRoomId(roomId);
                socket.emit("chat_history", { roomId, messages: messages.reverse() });
                
                console.log(`User ${userId} joined room: ${roomId}`);
            });

            // Handle sending messages (user -> seller)
            socket.on("send_message", async ({ sellerId, message }) => {
                if (!sellerId) {
                    socket.emit("error", { message: "sellerId is required" });
                    return;
                }

                if (!message || !message.trim()) {
                    socket.emit("error", { message: "Message cannot be empty" });
                    return;
                }

                const roomId = generateRoomId(userId, sellerId);
                
                // Save message to database
                const chatMessage = await ChatMessageService.create({
                    roomId,
                    userId,
                    sellerId,
                    senderId: userId,
                    senderRole: "user",
                    message: message.trim(),
                    read: false
                });

                // Emit to all sockets in the room (including sender)
                io.to(roomId).emit("new_message", {
                    roomId,
                    message: chatMessage,
                    senderId: userId,
                    senderRole: "user"
                });

                // Notify seller if they're not in the room
                io.to(`user-${sellerId}`).emit("new_message_notification", {
                    roomId,
                    message: chatMessage
                });
            });

            // Handle typing indicators
            socket.on("typing_start", ({ sellerId }) => {
                if (sellerId) {
                    const roomId = generateRoomId(userId, sellerId);
                    socket.to(roomId).emit("user_typing", { userId, isTyping: true });
                }
            });

            socket.on("typing_stop", ({ sellerId }) => {
                if (sellerId) {
                    const roomId = generateRoomId(userId, sellerId);
                    socket.to(roomId).emit("user_typing", { userId, isTyping: false });
                }
            });

            // Handle leaving a room
            socket.on("leave_chat_room", ({ sellerId }) => {
                if (sellerId) {
                    const roomId = generateRoomId(userId, sellerId);
                    socket.leave(roomId);
                    console.log(`User ${userId} left room: ${roomId}`);
                }
            });
        }

        // ========== SELLER HANDLERS ==========
        else if (userRole === "seller") {
            // Handle joining a chat room with a user
            socket.on("join_seller_chat_room", async ({ targetUserId }) => {
                if (!targetUserId) {
                    socket.emit("error", { message: "targetUserId is required for seller" });
                    return;
                }
                
                const roomId = generateRoomId(targetUserId, userId);
                socket.join(roomId);
                
                // Mark messages as read when seller joins
                await ChatMessageService.markAsRead(roomId, userId);
                
                // Send chat history
                const messages = await ChatMessageService.findByRoomId(roomId);
                socket.emit("chat_history", { roomId, messages: messages.reverse() });
                
                console.log(`Seller ${userId} joined room: ${roomId}`);
            });

            // Handle sending messages (seller -> user)
            socket.on("send_seller_message", async ({ targetUserId, message }) => {
                if (!targetUserId) {
                    socket.emit("error", { message: "targetUserId is required" });
                    return;
                }

                if (!message || !message.trim()) {
                    socket.emit("error", { message: "Message cannot be empty" });
                    return;
                }

                const roomId = generateRoomId(targetUserId, userId);
                
                // Save message to database
                const chatMessage = await ChatMessageService.create({
                    roomId,
                    userId: targetUserId,
                    sellerId: userId,
                    senderId: userId,
                    senderRole: "seller",
                    message: message.trim(),
                    read: false
                });

                // Emit to all sockets in the room
                io.to(roomId).emit("new_message", {
                    roomId,
                    message: chatMessage,
                    senderId: userId,
                    senderRole: "seller"
                });

                // Notify user if they're not in the room
                io.to(`user-${targetUserId}`).emit("new_message_notification", {
                    roomId,
                    message: chatMessage
                });
            });

            // Handle typing indicators for seller
            socket.on("seller_typing_start", ({ targetUserId }) => {
                if (targetUserId) {
                    const roomId = generateRoomId(targetUserId, userId);
                    socket.to(roomId).emit("seller_typing", { sellerId: userId, isTyping: true });
                }
            });

            socket.on("seller_typing_stop", ({ targetUserId }) => {
                if (targetUserId) {
                    const roomId = generateRoomId(targetUserId, userId);
                    socket.to(roomId).emit("seller_typing", { sellerId: userId, isTyping: false });
                }
            });

            // Handle leaving a room
            socket.on("leave_seller_chat_room", ({ targetUserId }) => {
                if (targetUserId) {
                    const roomId = generateRoomId(targetUserId, userId);
                    socket.leave(roomId);
                    console.log(`Seller ${userId} left room: ${roomId}`);
                }
            });
        }

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId} (${userRole})`);
        });
    });
};
