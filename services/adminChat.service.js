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
     * Only the admin who started it or any admin can close it (logic allows any admin currently).
     */
    async closeConversation(conversationId) {
        const conversation = await AdminConversation.findByIdAndUpdate(
            conversationId,
            { status: "closed" },
            { new: true }
        );
        return conversation;
    }

    /**
     * Send a message in a conversation.
     * Throws error if conversation is closed.
     */
    async sendMessage(conversationId, senderId, senderModel, messageText) {
        const conversation = await AdminConversation.findById(conversationId);

        if (!conversation) {
            throw new Error("Conversation not found");
        }

        if (conversation.status === "closed") {
            throw new Error("Conversation is closed");
        }

        const message = await AdminMessage.create({
            conversationId,
            senderId,
            senderModel,
            message: messageText,
            read: false
        });

        return message;
    }

    /**
     * Get chat history for a conversation
     */
    async getConversationHistory(conversationId) {
        return await AdminMessage.find({ conversationId }).sort({ createdAt: 1 });
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
}

export default new AdminChatService();
