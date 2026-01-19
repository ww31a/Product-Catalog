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


const AdminConversation = mongoose.model("AdminConversation", adminConversationSchema);
export default AdminConversation;
