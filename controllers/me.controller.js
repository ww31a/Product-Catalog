import AppUserService from "../services/appUser.service.js";
import UserService from "../services/user.service.js";
import SellerService from "../services/seller.service.js";
import SuperAdminService from "../services/superAdmin.service.js";
import OrderService from "../services/order.service.js";
import ChatMessageService from "../services/chatMessage.service.js";
import AdminChatService from "../services/adminChat.service.js";

export const getMe = async (req, res) => {
  try {
    const { userId, role } = req.auth;

    let response = {};

    if (role === "superadmin") {
      // SuperAdmin basic info
      const admin = await SuperAdminService.findById(userId);
      if (!admin)
        return res.status(404).json({ error: true, message: "Super admin not found" });

      response = {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: "superAdmin",
        createdAt: admin.createdAt,
      };

      // Unread messages for admin
      const adminConversations = await AdminChatService.getAllConversationsWithDetails();
      const adminUnread = adminConversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
      response.unreadMessages = adminUnread;

    } else {
      // user or seller
      const appUser = await AppUserService.findById(userId);
      if (!appUser)
        return res.status(404).json({ error: true, message: "User not found" });

      response = {
        id: appUser._id,
        name: appUser.name,
        email: appUser.email,
        roles: appUser.roles,
        createdAt: appUser.createdAt,
      };

      // ----- User-specific data -----
      if (appUser.roles.includes("user")) {
        // Cart count (total quantity)
        const userData = await UserService.findByUserId(userId);
        const cartData = userData?.cartData || {};
        const productCount = Object.keys(cartData).length;
        response.cartCount = productCount;

        // Order count
        const orderCount = await OrderService.countDocuments({ userId });
        response.orderCount = orderCount;

        // Unread chat messages (regular + admin support)
        const rooms = await ChatMessageService.getUserRooms(userId, "user");
        const adminRooms = await AdminChatService.getParticipantConversations(userId);

        const chatUnread = rooms.reduce((acc, room) => acc + (room.unreadCount || 0), 0);
        const adminUnread = adminRooms.reduce((acc, room) => acc + (room.unreadCount || 0), 0);

        response.unreadMessages = chatUnread + adminUnread;
      }

      // ----- Seller-specific data -----
      if (appUser.roles.includes("seller")) {
        const sellerData = await SellerService.findByUserId(userId);
        response.sellerData = sellerData || {};

        // Unread chat messages for seller (regular + admin support)
        const rooms = await ChatMessageService.getUserRooms(userId, "seller");
        const adminRooms = await AdminChatService.getParticipantConversations(userId);

        const chatUnread = rooms.reduce((acc, room) => acc + (room.unreadCount || 0), 0);
        const adminUnread = adminRooms.reduce((acc, room) => acc + (room.unreadCount || 0), 0);

        response.unreadMessages = chatUnread + adminUnread;
      }
    }

    return res.json({ success: true, user: response });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: true, message: err.message });
  }
};
