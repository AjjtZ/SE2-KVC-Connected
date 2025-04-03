const express = require("express");
const { generateCaptcha, generateCaptchaImage } = require("../utils/captchaUtility");
const authController = require("../controllers/authController");
const { requestPasswordReset, verifyResetCode, resetPassword, resendResetCode } = require("../controllers/forgotPasswordController");
const { authenticate } = require("../middleware/authMiddleware");
const db = require("../config/db");
const bcrypt = require('bcrypt');
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

console.log("DB module:", db);

// create router instance
const router = express.Router();
const captchaStore = new Map();
const pendingSignups = new Map();

router.use(cookieParser());

router.get('/verify-token', async (req, res) => { // Matches GET request
    console.log('GET /auth/verify-token hit'); // Log entry

    const token = req.cookies.token; // Read the token cookie
    console.log('Token from cookie:', token);

    if (!token) {
        console.log('No token cookie found.');
        return res.status(401).json({ error: 'Not authenticated: No token provided.' });
    }

    try {
        // Verify the token using your secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use YOUR secret key
        console.log('Token decoded successfully:', decoded);

        // Optional: Check if user still exists (good practice)
        // const user = await yourUserModel.findById(decoded.userId);
        // if (!user) {
        //     console.log('User from token not found in DB.');
        //     res.clearCookie('token', { path: '/' }); // Clear invalid cookie
        //     return res.status(401).json({ error: 'Not authenticated: User not found.' });
        // }

        // Make sure the role exists in the decoded token payload
        if (!decoded.role) {
             console.log('Role missing in token payload.');
             res.clearCookie('token', { path: '/' }); // Clear potentially bad cookie
             return res.status(401).json({ error: 'Not authenticated: Role missing in token.' });
        }

        console.log('Verification successful. Sending back role:', decoded.role);
        // Send back the role confirmed from the valid token
        res.status(200).json({ role: decoded.role });

    } catch (error) {
        console.error('Token verification error:', error.message);
        // Handle specific JWT errors if needed (e.g., TokenExpiredError)
        res.clearCookie('token', { path: '/' }); // Clear invalid/expired cookie
        return res.status(401).json({ error: 'Not authenticated: Invalid or expired token.' });
    }
});

// Postman test: verify captcha
router.post("/captcha/verify", (req, res) => {
    const { captchaResponse } = req.body;

    if (!captchaResponse) {
        return res.status(400).json({ error: "Missing CAPTCHA response." });
    }

    if (!req.session.captcha) {
        return res.status(400).json({ error: "Session expired. Please refresh CAPTCHA." });
    }

    if (captchaResponse !== req.session.captcha) {
        return res.status(400).json({ error: "❌ Incorrect CAPTCHA!" });
    }

    delete req.session.captcha;
    res.json({ message: "✅ CAPTCHA verified!" });
});

// route to generate captcha
router.get("/captcha", authController.getCaptcha);

// Routes for user signup and logout (delegated to authController)
router.post("/login", authController.loginUser);
router.post("/signup/petowner-step1", authController.signupPetOwnerStep1);
router.post("/signup/petowner-step2", authController.signupPetOwnerStep2);
router.post("/signup/employee", authController.signupEmployeeRequest);
router.post("/signup/employee-verify", authController.signupEmployeeComplete);
router.post("/logout", authenticate, authController.logoutUser);

// Routes for password reset
 router.post("/forgot-password", requestPasswordReset);
 router.post("/verify-reset-code", verifyResetCode);
 router.post("/reset-password", resetPassword);
 router.post("/resend-reset-code", resendResetCode);

module.exports = router;