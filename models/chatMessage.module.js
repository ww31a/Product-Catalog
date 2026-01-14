import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true // For faster queries
    },
    userId: {
        type: String,
        required: true
    },
    sellerId: {
        type: String,
        required: true
    },
    senderId: {
        type: String,
        required: true // The ID of who sent the message (could be userId or sellerId)
    },
    senderRole: {
        type: String,
        enum: ["user", "seller"],
        required: true
    },
    message: {
        type: String,
        required: function () {
            return !this.image;
        },
        trim: true
    },
    image: {
        type: String,
        required: function () {
            return !this.message;
        }
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Index for efficient queries
chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1, sellerId: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;

