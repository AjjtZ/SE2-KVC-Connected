// tests/controllers/authController.test.js
const path = require("path");
// Load env vars FIRST
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// --- Mock dependencies BEFORE importing the controller ---
// We will mock them again inside beforeEach after resetModules if needed
jest.mock("../../server/models/userModel");
jest.mock(
  "../../server/config/db",
  () => ({
    db: jest.fn(),
    dbConfig: {},
  }),
  { virtual: true }
);
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-token"),
}));

// --- Dynamic Requires (will happen inside beforeEach) ---
let authController;
let UserModel;
let bcrypt;
let jwt;

describe("AuthController", () => {
  let req, res;
  let bcryptCompareSpy;
  let jwtSignSpy;

  const mockEmail = "test@example.com";
  const mockPassword = "password";
  const mockHashedPassword = "hashedPassword";
  const mockCaptchaInput = "correctCaptcha";
  const mockUserId = 123;
  const mockUserRole = "admin";
  const mockToken = "mockGeneratedToken";

  beforeEach(() => {
    // Reset modules to ensure clean state, preventing potential caching issues
    jest.resetModules();

    jest.doMock("jsonwebtoken", () => ({
      sign: jest.fn().mockReturnValue(mockToken),
    }));

    // --- Re-require modules AFTER reset ---
    // This ensures we get fresh versions, especially the mocked ones
    authController = require("../../server/controllers/authController");
    UserModel = require("../../server/models/userModel"); // Get the fresh mocked version
    bcrypt = require("bcryptjs"); // Get a fresh bcrypt instance
    jwt = require("jsonwebtoken"); // Get a fresh jwt instance

    // Re-apply mocks if necessary (though jest.mock at top level *should* persist)
    // If the top-level mocks aren't working after resetModules, uncomment and adapt:
    // jest.mock('../../server/models/userModel'); // Re-mock if needed
    // jest.mock('../../server/config/db', () => ({ db: jest.fn(), dbConfig: {} }), { virtual: true }); // Re-mock if needed

    // Reset mocks call history
    jest.clearAllMocks(); // Good practice, though resetModules is stronger

    // --- Setup req, res, next ---
    req = { body: {}, session: {}, cookies: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    // --- Re-create spies AFTER requiring fresh modules ---
    bcryptCompareSpy = jest.spyOn(bcrypt, "compare");
    jwtSignSpy = jwt.sign;
  });

  // No need for afterEach restoreAllMocks when using resetModules,
  // as modules/spies are recreated each time. If you prefer restoreAllMocks,
  // remove resetModules and keep restoreAllMocks. Using both can be redundant/confusing.
  // afterEach(() => {
  //    jest.restoreAllMocks();
  // });

  describe("loginUser", () => {
    // --- Test Data (constants) ---
    const mockUser = {
      user_id: mockUserId,
      user_role: mockUserRole,
      user_password: mockHashedPassword,
    };

    // --- Helper functions for mocking (using mockImplementation) ---
    const mockUserModelFind = (userToReturn) => {
      // UserModel is now the freshly required mocked version
      UserModel.findByEmail.mockImplementation(async () => {
        // console.log(`[Mock Impl] UserModel.findByEmail called for ${email}. Returning:`, userToReturn); // Keep for debugging if needed
        return userToReturn;
      });
    };
    const mockUserModelFindReject = (error) => {
      UserModel.findByEmail.mockImplementation(async () => {
        // console.log(`[Mock Impl] UserModel.findByEmail called for ${email}. Throwing error:`, error); // Keep for debugging if needed
        throw error;
      });
    };

    // --- Test Cases ---

    it("should login user successfully with correct credentials", async () => {
      req.body = {
        email: mockEmail,
        password: mockPassword,
        captchaInput: mockCaptchaInput,
      };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFind(mockUser);
      bcryptCompareSpy.mockResolvedValue(true);

      // Create a spy on the generateToken method
      const generateTokenSpy = jest.spyOn(authController, "generateToken");

      // Mock the return value of generateToken
      generateTokenSpy.mockReturnValue(mockToken);

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledTimes(1);
      expect(UserModel.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(bcryptCompareSpy).toHaveBeenCalledTimes(1);
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        mockPassword,
        mockHashedPassword
      );

      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        message: "✅ Login successful!",
        redirectUrl: "/patients",
      });
      expect(res.status).not.toHaveBeenCalled();
      expect(req.session.captcha).toBeNull();
    });

    it("should return 401 for incorrect CAPTCHA", async () => {
      req.body = {
        email: mockEmail,
        password: mockPassword,
        captchaInput: "wrongCaptcha",
      };
      req.session.captcha = "correctCaptcha";

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).not.toHaveBeenCalled();
      expect(bcryptCompareSpy).not.toHaveBeenCalled(); // Spy is fresh, check it wasn't called
      expect(jwtSignSpy).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "❌ Incorrect CAPTCHA" });
      expect(req.session.captcha).toBe("correctCaptcha");
    });

    it("should return 401 for non-existent email", async () => {
      const nonExistentEmail = "nonexistent@example.com";
      req.body = {
        email: nonExistentEmail,
        password: mockPassword,
        captchaInput: mockCaptchaInput,
      };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFind(null); // Use helper on fresh UserModel mock

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith(nonExistentEmail);
      expect(bcryptCompareSpy).not.toHaveBeenCalled(); // Check fresh spy
      expect(jwtSignSpy).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid email or password",
      });
      expect(req.session.captcha).toBeNull();
    });

    it("should return 401 for incorrect password", async () => {
      const wrongPassword = "wrongPassword";
      req.body = {
        email: mockEmail,
        password: wrongPassword,
        captchaInput: mockCaptchaInput,
      };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFind(mockUser);
      bcryptCompareSpy.mockResolvedValue(false); // Configure fresh spy

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(bcryptCompareSpy).toHaveBeenCalledTimes(1);
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        wrongPassword,
        mockHashedPassword
      );

      expect(jwtSignSpy).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid email or password",
      });
      expect(req.session.captcha).toBeNull();
    });

    it("should return 500 if UserModel.findByEmail fails", async () => {
      req.body = {
        email: mockEmail,
        password: mockPassword,
        captchaInput: mockCaptchaInput,
      };
      req.session.captcha = mockCaptchaInput;

      const dbError = new Error("Database connection error");
      mockUserModelFindReject(dbError); // Configure fresh mock to reject

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(bcryptCompareSpy).not.toHaveBeenCalled(); // Check fresh spy
      expect(jwtSignSpy).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "❌ Server error during login",
      });
      expect(req.session.captcha).toBeNull();
    });

    it("should return 500 if bcrypt.compare fails", async () => {
      req.body = {
        email: mockEmail,
        password: mockPassword,
        captchaInput: mockCaptchaInput,
      };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFind(mockUser); // Configure fresh mock
      const bcryptError = new Error("Bcrypt error");
      bcryptCompareSpy.mockRejectedValue(bcryptError); // Configure fresh spy to reject

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(bcryptCompareSpy).toHaveBeenCalledTimes(1);
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        mockPassword,
        mockHashedPassword
      );

      expect(jwtSignSpy).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "❌ Server error during login",
      });
      expect(req.session.captcha).toBeNull();
    });
  });
});
