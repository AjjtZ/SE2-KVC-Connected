const jwt = require("jsonwebtoken");

exports.generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" } // Token expires in 15 minutes
    );
};

exports.authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "❌ Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user info (e.g., userId, role) to the request
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            // Clear the token from cookies
            res.clearCookie("token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "Strict",
            });
            return res.status(401).json({ error: "❌ Token expired. You have been logged out." });
        }
        return res.status(401).json({ error: "❌ Invalid token." });
    }
};