import ChatMessage from "../models/chatMessage.module.js";

class ChatMessageService {
    async create(messageData) {
        return await ChatMessage.create(messageData);
    }

    async findByRoomId(roomId, limit = 50, before = null) {
        const query = { roomId };
        
        if (before) {
            query.createdAt = { $lt: before };
        }
        
        // Return in ascending order (oldest first) for display
        return await ChatMessage.find(query)
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean();
    }

    async markAsRead(roomId, userId) {
        return await ChatMessage.updateMany(
            {
                roomId,
                senderId: { $ne: userId }, // Messages not sent by this user
                read: false
            },
            { read: true }
        );
    }

    async getUnreadCount(roomId, userId) {
        return await ChatMessage.countDocuments({
            roomId,
            senderId: { $ne: userId },
            read: false
        });
    }

    async getUserRooms(userId, role) {
        const query = role === "user"
            ? { userId }
            : { sellerId: userId };

        const rooms = await ChatMessage.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$roomId",
                    userId: { $first: "$userId" },
                    sellerId: { $first: "$sellerId" },
                    lastMessage: { $first: "$message" },
                    lastMessageTime: { $first: "$createdAt" },
                    lastSenderId: { $first: "$senderId" },
                    lastSenderRole: { $first: "$senderRole" },
                    lastImage: { $first: "$image" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$read", false] },
                                        { $ne: ["$senderId", userId] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { lastMessageTime: -1 } }
        ]);

        return rooms;
    }

    async deleteMessage(messageId, userId) {
        // Only allow deleting own messages
        return await ChatMessage.findOneAndDelete({
            _id: messageId,
            senderId: userId
        });
    }

    async updateMessage(messageId, userId, newMessage) {
        // Only allow updating own messages
        return await ChatMessage.findOneAndUpdate(
            {
                _id: messageId,
                senderId: userId
            },
            { 
                message: newMessage.trim(),
                edited: true,
                editedAt: new Date()
            },
            { new: true }
        );
    }
}

export default new ChatMessageService();