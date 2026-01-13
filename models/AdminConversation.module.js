import mongoose from "mongoose";

const adminConversationSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SuperAdmin",
            required: true,
        },
        participantId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'participantModel'
        },
        participantModel: {
            type: String,
            required: true,
            enum: ['User', 'Seller']
        },
        status: {
            type: String,
            enum: ["open", "closed"],
            default: "open",
        },
    },
    { timestamps: true }
);

// Index for efficient querying of user's active conversations
adminConversationSchema.index({ participantId: 1, participantModel: 1, status: 1 });
// Index for admin to see their assigned/started chats
adminConversationSchema.index({ adminId: 1, status: 1 });

const AdminConversation = mongoose.model("AdminConversation", adminConversationSchema);
export default AdminConversation;
