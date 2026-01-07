import ChatMessage from "../models/chatMessage.module.js";

class ChatMessageService {
    async create(messageData) {
        return await ChatMessage.create(messageData);
    }

    async findByRoomId(roomId, limit = 50) {
        return await ChatMessage.find({ roomId })
            .sort({ createdAt: -1 })
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
        
        return await ChatMessage.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$roomId",
                    lastMessage: { $max: "$createdAt" },
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
            { $sort: { lastMessage: -1 } }
        ]);
    }
}

export default new ChatMessageService();

