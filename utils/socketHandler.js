import jwt from "jsonwebtoken";
import ChatMessageService from "../services/chatMessage.service.js";
import AdminChatService from "../services/adminChat.service.js";
import AdminConversation from "../models/AdminConversation.module.js";

export const generateRoomId = (userId, sellerId) => {
    return `user-${userId}-seller-${sellerId}`;
};

// Shared support chat handlers for users and sellers
const setupSupportHandlers = (socket, io, userId) => {
    socket.on("join_support_room", async ({ conversationId }) => {
        if (!conversationId) return;

        const roomId = `admin-support-${conversationId}`;
        socket.join(roomId);

        await AdminChatService.markAsRead(conversationId, userId);

        // Send chat history
        const messages = await AdminChatService.getConversationHistory(conversationId);
        socket.emit("chat_history", { 
            roomId, 
            messages: messages.reverse() 
        });

        console.log(`User ${userId} joined support room: ${roomId}`);
    });

    socket.on("send_support_reply", async ({ conversationId, message, imageUrl }) => {
        if (!conversationId || (!message && !imageUrl)) return;

        try {
            const senderModel = socket.user.role === "user" ? "User" : "Seller";
            const savedMessage = await AdminChatService.sendMessage(
                conversationId,
                userId,
                senderModel,
                message,
                imageUrl
            );

            const roomId = `admin-support-${conversationId}`;
            io.to(roomId).emit("new_support_message", {
                conversationId,
                message: savedMessage
            });

            // Notify admin
            const conversation = await AdminConversation.findById(conversationId);
            if (conversation?.adminId) {
                io.to(`user-${conversation.adminId}`).emit("new_message_notification", {
                    roomId,
                    conversationId,
                    message: savedMessage,
                    isAdminChat: true
                });
            }
        } catch (error) {
            socket.emit("error", { message: error.message });
        }
    });

    socket.on("leave_support_room", ({ conversationId }) => {
        if (conversationId) {
            const roomId = `admin-support-${conversationId}`;
            socket.leave(roomId);
            console.log(`User ${userId} left support room: ${roomId}`);
        }
    });
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
            socket.on("join_chat_room", async ({ sellerId }) => {
                if (!sellerId) {
                    socket.emit("error", { message: "sellerId is required" });
                    return;
                }

                const roomId = generateRoomId(userId, sellerId);
                socket.join(roomId);

                await ChatMessageService.markAsRead(roomId, userId);

                const messages = await ChatMessageService.findByRoomId(roomId);
                socket.emit("chat_history", { roomId, messages: messages.reverse() });

                console.log(`User ${userId} joined room: ${roomId}`);
            });

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

                // Emit the message object directly (not nested)
                io.to(roomId).emit("new_message", {
                    roomId,
                    message: chatMessage
                });

                // Notify seller
                io.to(`user-${sellerId}`).emit("new_message_notification", {
                    roomId,
                    message: chatMessage
                });
            });

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

            socket.on("leave_chat_room", ({ sellerId }) => {
                if (sellerId) {
                    const roomId = generateRoomId(userId, sellerId);
                    socket.leave(roomId);
                    console.log(`User ${userId} left room: ${roomId}`);
                }
            });

            setupSupportHandlers(socket, io, userId);
        }

        // ========== SELLER HANDLERS ==========
        else if (userRole === "seller") {
            socket.on("join_seller_chat_room", async ({ targetUserId }) => {
                if (!targetUserId) {
                    socket.emit("error", { message: "targetUserId is required for seller" });
                    return;
                }

                const roomId = generateRoomId(targetUserId, userId);
                socket.join(roomId);

                await ChatMessageService.markAsRead(roomId, userId);

                const messages = await ChatMessageService.findByRoomId(roomId);
                socket.emit("chat_history", { roomId, messages: messages.reverse() });

                console.log(`Seller ${userId} joined room: ${roomId}`);
            });

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

                io.to(roomId).emit("new_message", {
                    roomId,
                    message: chatMessage
                });

                io.to(`user-${targetUserId}`).emit("new_message_notification", {
                    roomId,
                    message: chatMessage
                });
            });

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

            socket.on("leave_seller_chat_room", ({ targetUserId }) => {
                if (targetUserId) {
                    const roomId = generateRoomId(targetUserId, userId);
                    socket.leave(roomId);
                    console.log(`Seller ${userId} left room: ${roomId}`);
                }
            });

            setupSupportHandlers(socket, io, userId);
        }

        // ========== SUPER ADMIN HANDLERS ==========
        else if (userRole === "superadmin") {
            socket.on("admin_join_conversation", async ({ conversationId }) => {
                if (!conversationId) return;

                const roomId = `admin-support-${conversationId}`;
                socket.join(roomId);

                await AdminChatService.markAsRead(conversationId, userId);

                const history = await AdminChatService.getConversationHistory(conversationId);
                socket.emit("chat_history", { 
                    conversationId, 
                    messages: history.reverse() 
                });

                console.log(`Admin ${userId} joined conversation room: ${roomId}`);
            });

            socket.on("admin_send_message", async ({ conversationId, message, imageUrl }) => {
                if (!conversationId || (!message && !imageUrl)) {
                    socket.emit("error", { message: "conversationId and message/image are required" });
                    return;
                }

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

                    // Notify participant
                    const conv = await AdminConversation.findById(conversationId);
                    if (conv?.participantId) {
                        io.to(`user-${conv.participantId.toString()}`).emit("new_message_notification", {
                            roomId,
                            conversationId,
                            message: savedMessage,
                            isAdminChat: true
                        });
                    }
                } catch (error) {
                    socket.emit("error", { message: error.message });
                }
            });

            socket.on("admin_typing_start", ({ conversationId }) => {
                if (conversationId) {
                    const roomId = `admin-support-${conversationId}`;
                    socket.to(roomId).emit("admin_typing", { isTyping: true });
                }
            });

            socket.on("admin_typing_stop", ({ conversationId }) => {
                if (conversationId) {
                    const roomId = `admin-support-${conversationId}`;
                    socket.to(roomId).emit("admin_typing", { isTyping: false });
                }
            });

            socket.on("admin_leave_conversation", ({ conversationId }) => {
                if (conversationId) {
                    const roomId = `admin-support-${conversationId}`;
                    socket.leave(roomId);
                    console.log(`Admin ${userId} left conversation room: ${roomId}`);
                }
            });
        }

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId} (${userRole})`);
        });
    });
};