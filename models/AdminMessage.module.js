import mongoose from "mongoose";

const adminMessageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminConversation",
            required: true,
            index: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'senderModel'
        },
        senderModel: {
            type: String,
            required: true,
            enum: ['SuperAdmin', 'User', 'Seller']
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        read: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const AdminMessage = mongoose.model("AdminMessage", adminMessageSchema);
export default AdminMessage;
