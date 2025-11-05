import jwt from 'jsonwebtoken'


export const verifyAuthentication = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'No token, unauthorized' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken;
        next();

    }
    catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }

}