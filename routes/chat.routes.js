import express from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { actionLimiter } from "../middlewares/ratelimit.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import { getUserRooms, getSellerRooms, getRoomId, uploadChatImage } from "../controllers/chat.controller.js";
import chatUpload from "../middlewares/chatUpload.js";

import { withLogging } from "../middlewares/withLogging.js";

const chatRouter = express.Router();

// Buyer rooms and history
chatRouter.get("/rooms", verifyAuth, authorizeRoles("user"), withLogging('CHAT_LIST_ROOMS', getUserRooms));

// Seller rooms
chatRouter.get("/rooms/seller", verifyAuth, authorizeRoles("seller"), withLogging('SELLER_LIST_CHAT_ROOMS', getSellerRooms));

// Shared: compute room id
chatRouter.get("/room-id", verifyAuth, withLogging('CHAT_GET_ROOM_ID', getRoomId));

// Shared: upload image for chat
chatRouter.post("/upload", verifyAuth, actionLimiter(), chatUpload.single("image"), withLogging('CHAT_UPLOAD_IMAGE', uploadChatImage));

export default chatRouter;


