import express from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import { getUserRooms, getSellerRooms, getRoomId, uploadChatImage } from "../controllers/chat.controller.js";
import upload from "../middlewares/upload.js";

const chatRouter = express.Router();

// Buyer rooms and history
chatRouter.get("/rooms", verifyAuth, authorizeRoles("user"), getUserRooms);

// Seller rooms
chatRouter.get("/rooms/seller", verifyAuth, authorizeRoles("seller"), getSellerRooms);

// Shared: compute room id
chatRouter.get("/room-id", verifyAuth, getRoomId);

// Shared: upload image for chat
chatRouter.post("/upload", verifyAuth, upload.single("image"), uploadChatImage);

export default chatRouter;


