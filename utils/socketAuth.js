import jwt from "jsonwebtoken";

/**
 * Authenticate Socket.IO connection using JWT token
 * Token should be sent in auth.token or handshake.auth.token
 */
export const authenticateSocket = (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
        
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        socket.user = {
            userId: decoded.id,
            role: decoded.role,
            roles: decoded.roles || [decoded.role]
        };

        next();
    } catch (err) {
        console.error("Socket auth error:", err.message);
        next(new Error("Authentication error: Invalid or expired token"));
    }
};

