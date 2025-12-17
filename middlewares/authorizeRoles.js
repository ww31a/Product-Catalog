// middlewares/authorizeRoles.js
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.auth comes from verifyAuth middleware
    if (!req.auth || !req.auth.roles.some(role => allowedRoles.includes(role))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
};
