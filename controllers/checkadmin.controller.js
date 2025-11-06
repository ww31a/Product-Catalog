import jwt from "jsonwebtoken";

export const checkToken = (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ success: false });

        jwt.verify(token, JWT_SECRET);
        return res.json({ success: true });
    } catch (err) {
        return res.status(401).json({ success: false });
    }
};
