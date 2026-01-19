import { socketAuthMiddleware } from "./auth.middleware.js";
import { setupUserHandlers } from "./handlers/user.handlers.js";
import { setupSellerHandlers } from "./handlers/seller.handlers.js";
import { setupAdminHandlers } from "./handlers/admin.handlers.js";

export const initializeSocketHandlers = (io) => {
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const { role, userId } = socket.user;

    socket.join(`user-${userId}`);

    if (role === "user") setupUserHandlers(socket, io);
    else if (role === "seller") setupSellerHandlers(socket, io);
    else if (role === "superadmin") setupAdminHandlers(socket, io);
  });
};
