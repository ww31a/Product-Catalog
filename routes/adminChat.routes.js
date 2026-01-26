import express from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import limiter from "../middlewares/ratelimit.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import {
    getAdminConversations,
    getConversationHistory,
    startConversation,
    closeConversation,
    uploadChatImage
} from "../controllers/adminChat.controller.js";
import chatUpload from "../middlewares/chatUpload.js";

const adminChatRouter = express.Router();

// All routes require superadmin authentication
adminChatRouter.use(verifyAuth, authorizeRoles("superadmin"));

// Get all conversations
adminChatRouter.get("/conversations", getAdminConversations);

// Get conversation history
adminChatRouter.get("/conversations/:conversationId/history", getConversationHistory);

// Start new conversation
adminChatRouter.post("/conversations", limiter, startConversation);

// Close conversation
adminChatRouter.patch("/conversations/:conversationId/close", closeConversation);

// Upload image for chat
adminChatRouter.post("/upload", limiter, chatUpload.single("image"), uploadChatImage);

// Get available participants
// adminChatRouter.get("/participants", getAvailableParticipants);

export default adminChatRouter;