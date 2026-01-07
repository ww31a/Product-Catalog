import express from "express";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import { getUserRooms, getSellerRooms, getRoomHistory, getRoomId } from "../controllers/chat.controller.js";

const chatRouter = express.Router();

// Buyer rooms and history
chatRouter.get("/rooms", verifyAuth, authorizeRoles("user"), getUserRooms);

// Seller rooms
chatRouter.get("/rooms/seller", verifyAuth, authorizeRoles("seller"), getSellerRooms);

// Shared: fetch room history by roomId
chatRouter.get("/history", verifyAuth, getRoomHistory);

// Shared: compute room id
chatRouter.get("/room-id", verifyAuth, getRoomId);

export default chatRouter;


