import AdminConversation from "../models/AdminConversation.module.js";
import AdminMessage from "../models/AdminMessage.module.js";

class AdminChatService {
    /**
     * Start a conversation with a user or seller.
     * If an open conversation exists, returns it.
     */
    async startConversation(adminId, participantId, participantModel) {
        // Check for existing open conversation
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

    /**
     * Close a conversation. 
     * Only the admin who started it or any admin can close it.
     */
    async closeConversation(conversationId) {
        const conversation = await AdminConversation.findByIdAndUpdate(
            conversationId,
            { 
                status: "closed",
                closedAt: new Date()
            },
            { new: true }
        );
        
        if (!conversation) {
            throw new Error("Conversation not found");
        }
        
        return conversation;
    }

    /**
     * Send a message in a conversation.
     * Throws error if conversation is closed.
     */
    async sendMessage(conversationId, senderId, senderModel, messageText, imageUrl = null) {
        const conversation = await AdminConversation.findById(conversationId);

        if (!conversation) {
            throw new Error("Conversation not found");
        }

        if (conversation.status === "closed") {
            throw new Error("Conversation is closed");
        }

        const messageData = {
            conversationId,
            senderId,
            senderModel,
            read: false
        };

        if (messageText) messageData.message = messageText.trim();
        if (imageUrl) messageData.image = imageUrl;

        const message = await AdminMessage.create(messageData);

        // Update conversation's updatedAt timestamp
        await AdminConversation.findByIdAndUpdate(conversationId, {
            updatedAt: new Date()
        });

        return message;
    }

    /**
     * Get chat history for a conversation with pagination
     */
    async getConversationHistory(conversationId, limit = 50, before = null) {
        const query = { conversationId };
        
        if (before) {
            query.createdAt = { $lt: before };
        }
        
        // Return in ascending order (oldest first) for display
        return await AdminMessage.find(query)
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean();
    }

    /**
     * Mark messages as read
     */
    async markAsRead(conversationId, readerId) {
        // Mark all messages NOT sent by readerId as read
        await AdminMessage.updateMany(
            {
                conversationId,
                senderId: { $ne: readerId },
                read: false
            },
            { read: true }
        );
    }

    /**
     * Get unread count for a conversation
     */
    async getUnreadCount(conversationId, userId) {
        return await AdminMessage.countDocuments({
            conversationId,
            senderId: { $ne: userId },
            read: false
        });
    }

    /**
     * Delete a message (only sender can delete)
     */
    async deleteMessage(messageId, senderId) {
        return await AdminMessage.findOneAndDelete({
            _id: messageId,
            senderId
        });
    }

    /**
     * Update/edit a message (only sender can edit)
     */
    async updateMessage(messageId, senderId, newMessage) {
        return await AdminMessage.findOneAndUpdate(
            {
                _id: messageId,
                senderId
            },
            {
                message: newMessage.trim(),
                edited: true,
                editedAt: new Date()
            },
            { new: true }
        );
    }

    /**
     * Get all conversations (for admin dashboard)
     */
    async getAllConversations(filters = {}) {
        const query = {};
        
        if (filters.status) {
            query.status = filters.status;
        }
        
        if (filters.participantModel) {
            query.participantModel = filters.participantModel;
        }

        return await AdminConversation.find(query)
            .populate("participantId")
            .populate("adminId", "name email")
            .sort({ updatedAt: -1 });
    }
}

export default new AdminChatService();