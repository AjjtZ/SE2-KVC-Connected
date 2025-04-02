const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const UserModel = require("../models/userModel");
const PetModel = require("../models/petModel");
const { generateCaptcha, generateCaptchaImage } = require("../utils/captchaUtility");
const { hashPassword } = require("../utils/passwordUtility");
const { sendEmail } = require("../utils/emailUtility");
const db = require("../config/db");

const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
    );
};

exports.getCaptcha = (req, res) => {
    const captchaText = generateCaptcha();
    const captchaImage = generateCaptchaImage(captchaText);

    req.session.captcha = captchaText;
    res.json({ image: captchaImage, captchaKey: captchaText });
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password, captchaInput } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Validate CAPTCHA
        if (!req.session.captcha || captchaInput !== req.session.captcha) {
            const newCaptchaText = generateCaptcha();
            const newCaptchaImage = generateCaptchaImage(newCaptchaText);
            req.session.captcha = newCaptchaText;

            return res.status(401).json({
                error: "❌ Incorrect CAPTCHA",
                newCaptcha: { image: newCaptchaImage, captchaKey: newCaptchaText },
            });
        }
        req.session.captcha = null; // Clear the CAPTCHA after validation

        // Validate email and password
        const user = await UserModel.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.user_password))) {
            const newCaptchaText = generateCaptcha();
            const newCaptchaImage = generateCaptchaImage(newCaptchaText);
            req.session.captcha = newCaptchaText;

            return res.status(401).json({
                error: "Invalid email or password",
                newCaptcha: { image: newCaptchaImage, captchaKey: newCaptchaText },
            });
        }

        // Generate token and set cookie
        const token = generateToken(user.user_id, user.user_role);
        console.log("Generated Token:", token);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000,
        });

        res.json({
            message: "✅ Login successful!",
            role: user.user_role,
            redirectUrl: "/patients",
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "❌ Server error during login" });
    }
};

exports.signupPetOwnerStep1 = async (req, res) => {
    const { fname, lname, email, contact, address, password, confirmPassword } = req.body;

    if (!fname || !lname || !email || !contact || !address || !password || !confirmPassword) {
        return res.status(400).json({ error: "❌ All fields are required!" });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ error: "❌ Passwords do not match!" });
    }

    try {
        if (await UserModel.isEmailTaken(email)) {
            return res.status(400).json({ error: "❌ Email already in use." });
        }

        req.session.petOwnerData = {
            fname, lname, email, contact, address, password: await hashPassword(password)
        };
        req.session.step1Completed = true;

        res.json({
            message: "✅ Step 1 completed. Proceed to pet info.",
            redirectUrl: "/signup-petowner-petinfo"
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ error: "❌ Server error during signup." });
    }
};

exports.signupPetOwnerStep2 = async (req, res) => {
    const { petname, gender, speciesDescription, breed, birthdate, altPerson1, altContact1, captchaInput } = req.body;

    // Validate CAPTCHA
    if (!req.session.captcha || captchaInput !== req.session.captcha) {
        const newCaptchaText = generateCaptcha();
        const newCaptchaImage = generateCaptchaImage(newCaptchaText);
        req.session.captcha = newCaptchaText;

        return res.status(400).json({
            error: "❌ Incorrect CAPTCHA!",
            newCaptcha: { image: newCaptchaImage },
        });
    }
    req.session.captcha = null; // Clear the CAPTCHA after validation

    // Ensure Step 1 is completed
    if (!req.session.petOwnerData || !req.session.step1Completed) {
        return res.status(400).json({ error: "❌ Personal info missing or Step 1 not completed. Restart signup process." });
    }

    // Validate required fields
    if (!petname || !gender || !speciesDescription || !altPerson1 || !altContact1) {
        const newCaptchaText = generateCaptcha();
        const newCaptchaImage = generateCaptchaImage(newCaptchaText);
        req.session.captcha = newCaptchaText;

        return res.status(400).json({
            error: "❌ All fields are required except breed and birthdate!",
            newCaptcha: { image: newCaptchaImage, captchaKey: newCaptchaText },
        });
    }

    const { fname, lname, email, contact, address, password } = req.session.petOwnerData;

    try {
        // Find species ID by description
        const species = await PetModel.findSpeciesByDescription(speciesDescription);
        if (!species) {
            const newCaptchaText = generateCaptcha();
            const newCaptchaImage = generateCaptchaImage(newCaptchaText);
            req.session.captcha = newCaptchaText;

            return res.status(400).json({
                error: "❌ Invalid species selected.",
                newCaptcha: { image: newCaptchaImage, captchaKey: newCaptchaText },
            });
        }
        const speciesId = species.spec_id;

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Create pet owner
            const userId = await UserModel.createPetOwner(
                { fname, lname, email, contact, address, password, altPerson1, altContact1 },
                connection
            );

            // Create pet
            const petId = await PetModel.createPet(
                {
                    petname,
                    gender,
                    speciesId,
                    breed: breed || null, // Handle nullable breed
                    birthdate: birthdate || null, // Handle nullable birthdate
                    userId,
                },
                connection
            );
        
            // Commit transaction
            await connection.commit();

            // Generate token for the new pet owner
            const token = generateToken(userId, "owner");
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "Strict",
                maxAge: 15 * 60 * 1000,
            });

            // Clear session data
            req.session.petOwnerData = null;
            req.session.step1Completed = null;

            res.status(201).json({ message: "✅ Pet Owner account created successfully!", role: "owner", redirectUrl: "/patients" });
        } catch (error) {
            // Rollback transaction if anything fails
            await connection.rollback();
            console.error("Transaction Error:", error);

            const newCaptchaText = generateCaptcha();
            const newCaptchaImage = generateCaptchaImage(newCaptchaText);
            req.session.captcha = newCaptchaText;

            res.status(500).json({
                error: "❌ Server error during signup. Please try again.",
                newCaptcha: { image: newCaptchaImage, captchaKey: newCaptchaText },
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Signup Step 2 Error:", error);

        const newCaptchaText = generateCaptcha();
        const newCaptchaImage = generateCaptchaImage(newCaptchaText);
        req.session.captcha = newCaptchaText;

        res.status(500).json({
            error: "❌ Server error during signup.",
            newCaptcha: { image: newCaptchaImage, captchaKey: newCaptchaText },
        });
    }
};

// employee signup
exports.signupEmployeeRequest = async (req, res) => {
    const { fname, lname, contact, email, role, password, confirmPassword, captchaInput } = req.body;

    if (!req.session.captcha || captchaInput !== req.session.captcha) {
        const newCaptchaText = generateCaptcha();
        const newCaptchaImage = generateCaptchaImage(newCaptchaText);
        req.session.captcha = newCaptchaText;

        console.log("New CAPTCHA generated:", newCaptchaText); // Debug log

        return res.status(400).json({
            error: "❌ Incorrect CAPTCHA!",
            newCaptcha: { image: newCaptchaImage },
        });
    }
    req.session.captcha = null;

    if (!fname || !lname || !email || !role || !password || !confirmPassword) {
        return res.status(400).json({ error: "❌ All fields are required!" });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: "❌ Passwords do not match!" });
    }

    try {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: "❌ Email already in use." });
        }

        const accessCode = crypto.randomBytes(4).toString("hex").toUpperCase();

        req.session.employeeData = { fname, lname, contact, email, role, password, accessCode };

        const clinicOwnerEmail = process.env.CLINIC_OWNER_EMAIL;
        const subject = "New Employee Signup Request - PAWtient Tracker";
        const body = `Hello Clinic Owner,\n\nA new employee has requested to sign up:\n\nName: ${fname} ${lname}\n Contact Number: ${contact}\nEmail: ${email}\nPosition: ${role}\n\nTo approve, provide them with the following access code:\n\nAccess Code: ${accessCode}\n\nIf this request is unauthorized, please ignore this email.`;

        await sendEmail(clinicOwnerEmail, subject, body);

        res.json({
            message: "✅ Signup request sent. Await access code from the clinic owner.",
            redirectUrl: "/signup-employee-accesscode",
        });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "❌ Server error." });
    }
};

// Complete Employee Signup
exports.signupEmployeeComplete = async (req, res) => {
    const { accessCode } = req.body;

    if (!accessCode) {
        return res.status(400).json({ error: "❌ Access code is required!" });
    }

    try {
        if (!req.session.employeeData) {
            return res.status(400).json({ error: "❌ No signup request found. Please start again." });
        }

        const { fname, lname, contact, role, password, accessCode: storedCode, email } = req.session.employeeData;

        if (accessCode !== storedCode) {
            return res.status(400).json({ error: "❌ Invalid access code." });
        }

        const hashedPassword = await hashPassword(password);
        const userId = await UserModel.createEmployee({ fname, lname, contact, email, role, hashedPassword });

        const token = generateToken(userId, role);
        console.log('Generated Token:', token);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000
        });

        req.session.employeeData = null;

        res.json({
            message: "✅ Signup successful! You can now log in.",
            role: role,
            redirectUrl: "/patients",
        });
    } catch (error) {
        console.error("Employee Signup Error:", error);
        res.status(500).json({ error: "❌ Server error." });
    }
};

// user logout
exports.logoutUser = (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: "Logout failed" });
            }

            res.clearCookie("connect.sid", { path: "/" });
            res.clearCookie("token", { path: "/" });

            return res.json({ message: "Logout successful" });
        });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({ error: "❌ Server error during logout" });
    }
};

exports.generateToken = generateToken;