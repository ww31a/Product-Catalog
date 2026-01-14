import jwt from "jsonwebtoken";
import ChatMessageService from "../services/chatMessage.service.js";
import AdminChatService from "../services/adminChat.service.js";


export const generateRoomId = (userId, sellerId) => {
    return `user-${userId}-seller-${sellerId}`;
};


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
            socket.on("send_message", async ({ sellerId, message, imageUrl }) => {
                if (!sellerId) {
                    socket.emit("error", { message: "sellerId is required" });
                    return;
                }

                if ((!message || !message.trim()) && !imageUrl) {
                    socket.emit("error", { message: "Message or image is required" });
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
                    message: message ? message.trim() : undefined,
                    image: imageUrl,
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

            // ========== USER SUPPORT CHAT HANDLERS ==========
            socket.on("join_support_room", async ({ conversationId }) => {
                if (!conversationId) return;

                // Join the support room
                const roomId = `admin-support-${conversationId}`;
                socket.join(roomId);

                // Mark messages as read
                await AdminChatService.markAsRead(conversationId, userId);

                console.log(`User ${userId} joined support room: ${roomId}`);
            });

            socket.on("send_support_reply", async ({ conversationId, message, imageUrl }) => {
                if (!conversationId || (!message && !imageUrl)) return;

                try {
                    const savedMessage = await AdminChatService.sendMessage(
                        conversationId,
                        userId,
                        "User",
                        message,
                        imageUrl
                    );

                    const roomId = `admin-support-${conversationId}`;
                    io.to(roomId).emit("new_support_message", {
                        conversationId,
                        message: savedMessage
                    });

                    // Notify admins (could be room based or broadcast)
                    // For now, assuming admins join the support room upon selecting conversation
                } catch (error) {
                    socket.emit("error", { message: error.message });
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
            socket.on("send_seller_message", async ({ targetUserId, message, imageUrl }) => {
                if (!targetUserId) {
                    socket.emit("error", { message: "targetUserId is required" });
                    return;
                }

                if ((!message || !message.trim()) && !imageUrl) {
                    socket.emit("error", { message: "Message or image is required" });
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
                    message: message ? message.trim() : undefined,
                    image: imageUrl,
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

            // ========== SELLER SUPPORT CHAT HANDLERS ==========
            socket.on("join_support_room", async ({ conversationId }) => {
                if (!conversationId) return;

                // Join the support room
                const roomId = `admin-support-${conversationId}`;
                socket.join(roomId);

                // Mark messages as read
                await AdminChatService.markAsRead(conversationId, userId);

                console.log(`Seller ${userId} joined support room: ${roomId}`);
            });

            socket.on("send_support_reply", async ({ conversationId, message, imageUrl }) => {
                if (!conversationId || (!message && !imageUrl)) return;

                try {
                    const savedMessage = await AdminChatService.sendMessage(
                        conversationId,
                        userId,
                        "Seller",
                        message,
                        imageUrl
                    );

                    const roomId = `admin-support-${conversationId}`;
                    io.to(roomId).emit("new_support_message", {
                        conversationId,
                        message: savedMessage
                    });
                } catch (error) {
                    socket.emit("error", { message: error.message });
                }
            });
        }

        // ========== SUPER ADMIN HANDLERS ==========
        else if (userRole === "superadmin") {
            // Start or Open Conversation
            socket.on("admin_start_conversation", async ({ targetId, targetModel }) => {
                try {
                    const conversation = await AdminChatService.startConversation(userId, targetId, targetModel);

                    const roomId = `admin-support-${conversation._id}`;
                    socket.join(roomId);

                    // Fetch history
                    const history = await AdminChatService.getConversationHistory(conversation._id);

                    socket.emit("conversation_started", {
                        conversation,
                        history
                    });

                } catch (error) {
                    socket.emit("error", { message: error.message });
                }
            });

            // Send Message
            socket.on("admin_send_message", async ({ conversationId, message, imageUrl }) => {
                try {
                    const savedMessage = await AdminChatService.sendMessage(
                        conversationId,
                        userId,
                        "SuperAdmin",
                        message,
                        imageUrl
                    );

                    const roomId = `admin-support-${conversationId}`;
                    io.to(roomId).emit("new_support_message", {
                        conversationId,
                        message: savedMessage
                    });

                } catch (error) {
                    socket.emit("error", { message: error.message });
                }
            });

            // Close Conversation
            socket.on("admin_close_conversation", async ({ conversationId }) => {
                try {
                    const conversation = await AdminChatService.closeConversation(conversationId);
                    const roomId = `admin-support-${conversationId}`;

                    io.to(roomId).emit("conversation_closed", { conversationId });
                } catch (error) {
                    socket.emit("error", { message: error.message });
                }
            });

            // Join existing conversation room (for monitoring/rejoining)
            socket.on("admin_join_conversation", ({ conversationId }) => {
                const roomId = `admin-support-${conversationId}`;
                socket.join(roomId);
            });
        }

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId} (${userRole})`);
        });
    });
};
