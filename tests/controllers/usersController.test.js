const request = require("supertest");
const express = require("express");
// Remove express-session unless your actual authenticate middleware RELIES on it.
// If authenticate uses JWT, session is likely not needed for these tests.
// const session = require("express-session");
const usersController = require("../../server/controllers/usersController");
const UserModel = require("../../server/models/userModel");
const {
  hashPassword,
  comparePassword,
} = require("../../server/utils/passwordUtility");

// --- Mock Middleware ---
// Mock the entire module containing the authenticate middleware
jest.mock("../../server/middleware/authMiddleware", () => ({
  // Provide a mock implementation for the 'authenticate' export
  authenticate: jest.fn((req, res, next) => {
    // Simulate successful authentication by attaching user info to req
    // We'll add userId: 1 for most tests.
    // For the "not logged in" test, we need to NOT attach this.
    // We can use a flag or a custom header set *only* in tests needing auth.
    // Let's use a simple custom header approach for clarity.
    if (req.headers['x-test-authenticated-user-id']) {
      req.user = { userId: parseInt(req.headers['x-test-authenticated-user-id'], 10) };
    }
    next(); // Proceed to the next middleware or route handler
  }),
}));
// --- End Mock Middleware ---

jest.mock("../../server/models/userModel");
jest.mock("../../server/utils/passwordUtility");

const app = express();
app.use(express.json());
// Remove session if not needed by auth middleware being tested
// app.use(
//   session({
//     secret: "testsecret",
//     resave: false,
//     saveUninitialized: true,
//   })
// );

// Mount routes *after* mocking middleware if needed, although usually order doesn't matter for mocks like this
app.put("/users/employee/profile", usersController.updateEmployeeProfile);
app.put("/users/owner/profile", usersController.updateOwnerProfile);
app.post("/users/change-password", usersController.changePassword);

describe("Users Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock function's call history etc. if needed
    require('../../server/middleware/authMiddleware').authenticate.mockClear();
  });

  // --- Employee Profile Tests ---
  it("should update employee profile successfully", async () => {
    UserModel.getUserById.mockResolvedValue({
      user_id: 1,
      user_firstname: "John",
      user_lastname: "Doe",
      user_email: "john.doe@example.com",
      user_contact: "1234567890",
    });
    UserModel.updateEmployeeProfile.mockResolvedValue();

    const response = await request(app)
      .put("/users/employee/profile")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        firstname: "Jane",
        lastname: "Doe",
        email: "jane.doe@example.com",
        contact: "0987654321",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "✅ Employee profile updated successfully!"
    );
    // Verify the correct user ID was passed from mocked req.user
    expect(UserModel.updateEmployeeProfile).toHaveBeenCalledWith(1, "Jane", "Doe", "jane.doe@example.com", "0987654321");
  });

  it("should return error if server error occurs while updating employee profile", async () => {
    UserModel.getUserById.mockResolvedValue({
      user_id: 1,
      user_firstname: "John", // ... other fields
    });
    UserModel.updateEmployeeProfile.mockRejectedValue(
      new Error("Database connection failed") // Simulate DB error
    );

    const response = await request(app)
      .put("/users/employee/profile")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        firstname: "Jane", // ... other fields
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("❌ Server error while updating profile.");
  });

  // --- Owner Profile Tests ---
  it("should update owner profile successfully", async () => {
    UserModel.getUserById.mockResolvedValue({
      user_id: 1,
      user_firstname: "John", // ... other fields
    });
    UserModel.getOwnerByUserId.mockResolvedValue({
      owner_address: "123 Main St", // ... other fields
    });
    UserModel.updateOwnerProfile.mockResolvedValue();

    const response = await request(app)
      .put("/users/owner/profile")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        firstname: "Jane",
        lastname: "Doe",
        email: "jane.doe@example.com",
        contact: "0987654321",
        address: "456 Elm St",
        altperson: "John Smith",
        altcontact: "1122334455",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "✅ Pet owner profile updated successfully!"
    );
    expect(UserModel.updateOwnerProfile).toHaveBeenCalledWith(1, "Jane", "Doe", "jane.doe@example.com", "0987654321", "456 Elm St", "John Smith", "1122334455");
  });

  it("should return error if server error occurs while updating owner profile", async () => {
    UserModel.getUserById.mockResolvedValue({ user_id: 1 /* ... */ });
    UserModel.getOwnerByUserId.mockResolvedValue({ owner_address: "123 Main St" /* ... */ });
    UserModel.updateOwnerProfile.mockRejectedValue(new Error("Server error"));

    const response = await request(app)
      .put("/users/owner/profile")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        firstname: "Jane", // ... other fields
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("❌ Server error while updating profile.");
  });


  // --- Change Password Tests ---
  it("should change password successfully", async () => {
    UserModel.getPasswordById.mockResolvedValue("hashedpassword");
    comparePassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue("newhashedpassword");
    UserModel.updatePassword.mockResolvedValue();

    const response = await request(app)
      .post("/users/change-password")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        currentPassword: "oldpassword",
        newPassword: "newpassword",
        confirmNewPassword: "newpassword",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("✅ Password changed successfully!");
    expect(UserModel.getPasswordById).toHaveBeenCalledWith(1);
    expect(comparePassword).toHaveBeenCalledWith("oldpassword", "hashedpassword");
    expect(hashPassword).toHaveBeenCalledWith("newpassword");
    expect(UserModel.updatePassword).toHaveBeenCalledWith(1, "newhashedpassword");
  });

  it("should return error if current password is incorrect", async () => {
    UserModel.getPasswordById.mockResolvedValue("hashedpassword");
    comparePassword.mockResolvedValue(false); // Simulate incorrect password

    const response = await request(app)
      .post("/users/change-password")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        currentPassword: "wrongpassword",
        newPassword: "newpassword",
        confirmNewPassword: "newpassword",
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("❌ Incorrect current password.");
    expect(UserModel.updatePassword).not.toHaveBeenCalled(); // Ensure password wasn't updated
  });

  it("should return error if new passwords do not match", async () => {
    // No need to mock DB calls if validation fails first
    const response = await request(app)
      .post("/users/change-password")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        currentPassword: "oldpassword",
        newPassword: "newpassword",
        confirmNewPassword: "differentpassword",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("❌ New passwords do not match!");
  });

  it("should return error if required fields are missing when changing password", async () => {
    const response = await request(app)
      .post("/users/change-password")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        currentPassword: "oldpassword",
        // Missing newPassword and confirmNewPassword
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("❌ All fields are required!");
  });

  // --- Test Unauthenticated Access ---
  it("should return error if user is not logged in when changing password", async () => {
    // DO NOT set the 'x-test-authenticated-user-id' header here
    const response = await request(app)
      .post("/users/change-password")
      .send({
        currentPassword: "oldpassword",
        newPassword: "newpassword",
        confirmNewPassword: "newpassword",
      });

    expect(response.status).toBe(401);
    // Now it should correctly hit the controller's check
    expect(response.body.error).toBe("❌ Unauthorized. Please log in.");
  });
});