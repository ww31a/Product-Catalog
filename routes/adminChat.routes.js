import express from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import {
    getAdminConversations,
    getConversationHistory,
    startConversation,
    closeConversation,
    // getAvailableParticipants
} from "../controllers/adminChat.controller.js";

const adminChatRouter = express.Router();

// All routes require superadmin authentication
adminChatRouter.use(verifyAuth, authorizeRoles("superadmin"));

// Get all conversations
adminChatRouter.get("/conversations", getAdminConversations);

// Get conversation history
adminChatRouter.get("/conversations/:conversationId/history", getConversationHistory);

// Start new conversation
adminChatRouter.post("/conversations", startConversation);

// Close conversation
adminChatRouter.patch("/conversations/:conversationId/close", closeConversation);

// Get available participants
// adminChatRouter.get("/participants", getAvailableParticipants);

export default adminChatRouter;