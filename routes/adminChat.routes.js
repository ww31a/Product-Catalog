import express from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { actionLimiter } from "../middlewares/ratelimit.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import {
    getAdminConversations,
    getConversationHistory,
    startConversation,
    closeConversation,
    uploadChatImage
} from "../controllers/adminChat.controller.js";
import chatUpload from "../middlewares/chatUpload.js";

import { withLogging } from "../middlewares/withLogging.js";

const adminChatRouter = express.Router();

// All routes require superadmin authentication
adminChatRouter.use(verifyAuth, authorizeRoles("superadmin"));

// Get all conversations
adminChatRouter.get("/conversations", withLogging('ADMIN_CHAT_LIST_CONVERSATIONS', getAdminConversations));

// Get conversation history
adminChatRouter.get("/conversations/:conversationId/history", withLogging('ADMIN_CHAT_HISTORY', getConversationHistory));

// Start new conversation
adminChatRouter.post("/conversations", actionLimiter, withLogging('ADMIN_CHAT_START', startConversation));

// Close conversation
adminChatRouter.patch("/conversations/:conversationId/close", withLogging('ADMIN_CHAT_CLOSE', closeConversation));

// Upload image for chat
adminChatRouter.post("/upload", actionLimiter(), chatUpload.single("image"), withLogging('ADMIN_CHAT_UPLOAD_IMAGE', uploadChatImage));

// Get available participants
// adminChatRouter.get("/participants", getAvailableParticipants);

export default adminChatRouter;