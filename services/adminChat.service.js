import AdminConversation from "../models/AdminConversation.module.js";
import AdminMessage from "../models/AdminMessage.module.js";

class AdminChatService {

    async startConversation(adminId, participantId, participantModel) {
        let conversation = await AdminConversation.findOne({
            participantId,
            participantModel,
            status: "open"
        });

        if (!conversation) {
            conversation = await AdminConversation.create({
                adminId,
                participantId,
                participantModel,
                status: "open"
            });
        }

        return conversation;
    }

    async closeConversation(conversationId) {
        const conversation = await AdminConversation.findByIdAndUpdate(
            conversationId,
            { status: "closed", closedAt: new Date() },
            { new: true }
        );

        if (!conversation) throw new Error("Conversation not found");
        return conversation;
    }

    async sendMessage(conversationId, senderId, senderModel, messageText, imageUrl) {
        const conversation = await AdminConversation.findById(conversationId);
        if (!conversation) throw new Error("Conversation not found");
        if (conversation.status === "closed") throw new Error("Conversation is closed");

        if ((!messageText || !messageText.trim()) && !imageUrl) {
            throw new Error("Message or image is required");
        }

        const message = await AdminMessage.create({
            conversationId,
            senderId,
            senderModel,
            message: messageText?.trim() || null,
            image: imageUrl || null,
            read: false
        });

        await AdminConversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });
        return message;
    }

    async getConversationHistory(conversationId, limit = 50) {
        return await AdminMessage.find({ conversationId })
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean();
    }

    async markAsRead(conversationId, readerId) {
        await AdminMessage.updateMany(
            { conversationId, senderId: { $ne: readerId }, read: false },
            { read: true }
        );
    }

    // For admin dashboard - single aggregation query
    async getAllConversationsWithDetails() {
        return await AdminConversation.aggregate([
            { $sort: { updatedAt: -1 } },
            {
                $lookup: {
                    from: "adminmessages",
                    localField: "_id",
                    foreignField: "conversationId",
                    as: "messages"
                }
            },
            {
                $addFields: {
                    lastMessage: { $last: "$messages.message" },
                    lastMessageTime: { $ifNull: [{ $last: "$messages.createdAt" }, "$updatedAt"] },
                    unreadCount: {
                        $size: {
                            $filter: {
                                input: "$messages",
                                cond: { $and: [{ $eq: ["$$this.read", false] }, { $ne: ["$$this.senderModel", "SuperAdmin"] }] }
                            }
                        }
                    }
                }
            },
            { $project: { messages: 0, adminId: 0 } }
        ]);
    }

    // For user/seller inbox - single aggregation query
    async getParticipantConversations(participantId) {
        return await AdminConversation.aggregate([
            { $match: { participantId, status: "open" } },
            { $sort: { updatedAt: -1 } },
            {
                $lookup: {
                    from: "adminmessages",
                    localField: "_id",
                    foreignField: "conversationId",
                    as: "messages"
                }
            },
            {
                $addFields: {
                    lastMessage: { $last: "$messages.message" },
                    lastMessageTime: { $ifNull: [{ $last: "$messages.createdAt" }, "$updatedAt"] },
                    unreadCount: {
                        $size: {
                            $filter: {
                                input: "$messages",
                                cond: { $and: [{ $eq: ["$$this.read", false] }, { $eq: ["$$this.senderModel", "SuperAdmin"] }] }
                            }
                        }
                    },
                    isAdminChat: { $literal: true },
                    roomId: { $concat: ["admin-support-", { $toString: "$_id" }] }
                }
            },
            { $project: { messages: 0, adminId: 0, participantId: 0, participantModel: 0 } }
        ]);
    }
}

export default new AdminChatService();