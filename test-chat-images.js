
import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminChatService from "./services/adminChat.service.js";
import ChatMessageService from "./services/chatMessage.service.js";
import AdminConversation from "./models/AdminConversation.module.js";
import AdminMessage from "./models/AdminMessage.module.js";
import ChatMessage from "./models/chatMessage.module.js";

dotenv.config();

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // 1. Test Admin Chat Service
        console.log("\nTesting Admin Chat Service...");
        const adminId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();

        let conversation = await AdminConversation.create({
            adminId,
            participantId: userId,
            participantModel: "User",
            status: "open"
        });

        console.log("Created test conversation:", conversation._id);

        const adminMsg = await AdminChatService.sendMessage(
            conversation._id,
            adminId,
            "SuperAdmin",
            "Check this image",
            "https://res.cloudinary.com/demo/image/upload/sample.jpg"
        );

        console.log("Created admin message with image:", adminMsg);

        if (adminMsg.image === "https://res.cloudinary.com/demo/image/upload/sample.jpg" && adminMsg.message === "Check this image") {
            console.log("✅ Admin message with image successfully created.");
        } else {
            console.error("❌ Admin message verification failed.");
        }

        const adminMsgOnlyImage = await AdminChatService.sendMessage(
            conversation._id,
            adminId,
            "SuperAdmin",
            null,
            "https://res.cloudinary.com/demo/image/upload/sample2.jpg"
        );

        console.log("Created admin message with ONLY image:", adminMsgOnlyImage);
        if (adminMsgOnlyImage.image && !adminMsgOnlyImage.message) {
            console.log("✅ Admin message with only image successfully created.");
        }

        // 2. Test User-Seller Chat Service
        console.log("\nTesting User-Seller Chat Service...");
        const sellerId = new mongoose.Types.ObjectId();
        const roomId = `user-${userId}-seller-${sellerId}`;

        const chatMsg = await ChatMessageService.create({
            roomId,
            userId: userId.toString(),
            sellerId: sellerId.toString(),
            senderId: userId.toString(),
            senderRole: "user",
            message: "Look at this!",
            image: "https://res.cloudinary.com/demo/image/upload/user_sample.jpg",
            read: false
        });

        console.log("Created chat message with image:", chatMsg);

        if (chatMsg.image === "https://res.cloudinary.com/demo/image/upload/user_sample.jpg") {
            console.log("✅ User-Seller message with image successfully created.");
        } else {
            console.error("❌ User-Seller message verification failed.");
        }

        // Cleanup
        await AdminConversation.deleteOne({ _id: conversation._id });
        await AdminMessage.deleteMany({ conversationId: conversation._id });
        await ChatMessage.deleteOne({ _id: chatMsg._id });

        console.log("\nTest completed and cleanup done.");
        process.exit(0);

    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

runTest();
