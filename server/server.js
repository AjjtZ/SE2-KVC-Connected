require("dotenv").config();

// necessary imports
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");

// database and route handler imports
const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const petRoutes = require("./routes/petRoutes");
const { authenticate, authorize } = require("./middleware/authMiddleware");
const vaccineRoutes = require("./routes/vaccineRoutes");
const recordRoutes = require("./routes/recordRoutes");

// express app initializer
const app = express();
const port = process.env.PORT || 5000;

// middleware setup
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, 
        httpOnly: true, 
        sameSite: "Lax",
        maxAge: 1000 * 60 * 15, 
    }
}));

app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173" || "http://localhost:5174"], 
    credentials: true
}));
app.use(express.urlencoded({ extended: true })); 
app.use(bodyParser.json());

app.get("/auth/status", (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

app.get("/debug-session", (req, res) => {
    res.json({ captcha: req.session.captcha || "No CAPTCHA stored" });
});
app.get("/test-session", (req, res) => {
    req.session.test = "Session is working!";
    res.json({ message: "Session set" });
});

app.get("/check-session", (req, res) => {
    res.json({ sessionData: req.session });
});

app.get('/session-data', (req, res) => {
    res.json({ formData: req.session.formData || {} });
});

app.get("/protected-route", authenticate, (req, res) => {
    res.json({ message: "✅ Access granted!", user: req.user });
});

app.use(session({ secret: "your-secret-key", resave: false, saveUninitialized: true }));

// route handlers
app.use("/auth", authRoutes);
app.use("/user", usersRoutes);
app.use("/pets", petRoutes);
app.use("/vax", vaccineRoutes);
app.use("/recs", recordRoutes);

//FILE UPLOADS
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
    console.log(`Unhandled request: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "Not Found" });
});

// starts the server
app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});