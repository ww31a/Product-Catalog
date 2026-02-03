import express from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { actionLimiter } from "../middlewares/ratelimit.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import { getUserRooms, getSellerRooms, getRoomId, uploadChatImage } from "../controllers/chat.controller.js";
import chatUpload from "../middlewares/chatUpload.js";
import { withLogging } from "../middlewares/withLogging.js";



const chatRouter = express.Router();

// Buyer rooms and history
chatRouter.get("/rooms", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("user")), getUserRooms);

// Seller rooms
chatRouter.get("/rooms/seller", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getSellerRooms);

// Shared: compute room id
chatRouter.get("/room-id", withLogging('Auth', verifyAuth), getRoomId);

// Shared: upload image for chat
chatRouter.post("/upload", withLogging('Auth', verifyAuth), actionLimiter(), chatUpload.single("image"), uploadChatImage);

export default chatRouter;


