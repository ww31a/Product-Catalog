
import jwt from "jsonwebtoken";

export const verifyAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.auth = {
            userId: decoded.id,
            role: decoded.role,
            roles: decoded.roles || [decoded.role] // backward compatible
        };

        next();
    } catch (err) {
        console.error("Auth error:", err.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }

};
