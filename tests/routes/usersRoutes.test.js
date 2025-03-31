const request = require('supertest');
const express = require('express');
const session = require('express-session');

// --- Mock Dependencies ---
// Mock the controller BEFORE requiring the routes
jest.mock('../../server/controllers/usersController', () => ({
    updateEmployeeProfile: jest.fn(),
    updateOwnerProfile: jest.fn(),
    changePassword: jest.fn(),
}));

// Mock the middleware BEFORE requiring the routes
jest.mock('../../server/middleware/authMiddleware', () => ({
    authenticate: jest.fn(), // We'll provide implementation per test
    // authorize is not used in these routes based on the snippet, so no need to mock explicitly unless routes file requires it
}));

// --- Require modules AFTER mocks ---
const usersRoutes = require('../../server/routes/usersRoutes'); // Adjust path if needed
const usersController = require('../../server/controllers/usersController'); // Get the mocked controller
const { authenticate: mockedAuthenticate } = require('../../server/middleware/authMiddleware'); // Get the mocked middleware

// --- Test Application Setup ---
const app = express();
app.use(express.json()); // Needed to parse JSON bodies

// Include session middleware if your actual 'authenticate' depends on session state
app.use(session({
    secret: 'test-secret-key', // Use a consistent secret for testing
    resave: false,
    saveUninitialized: false, // Usually false for login sessions
    cookie: { secure: false } // Set secure: true if testing HTTPS
}));

// Mount the routes
app.use('/users', usersRoutes);

// --- Test Suite ---
describe('Users Routes (/users)', () => {
    const mockUserId = 'user-123';
    const mockUser = { userId: mockUserId, /* other user properties */ };
    let agent;

    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks between tests

        // Create a fresh agent for each test to avoid cookie/session interference
        agent = request.agent(app); // Use agent to handle cookies/session if needed by auth

        // Default successful authentication mock (can be overridden in specific tests)
        mockedAuthenticate.mockImplementation((req, res, next) => {
            req.user = mockUser; // Attach mock user
            req.session = req.session || {}; // Ensure session exists if needed
            req.session.userId = mockUserId; // Simulate session-based auth if used
            next(); // Proceed
        });

        // Default successful controller mocks (can be overridden)
        usersController.updateEmployeeProfile.mockImplementation((req, res) => {
            res.status(200).json({ message: '✅ Employee profile updated successfully!' });
        });
        usersController.updateOwnerProfile.mockImplementation((req, res) => {
            res.status(200).json({ message: '✅ Pet owner profile updated successfully!' });
        });
        usersController.changePassword.mockImplementation((req, res) => {
            res.status(200).json({ message: '✅ Password changed successfully!' });
        });
    });

    // --- Test PUT /users/update-employee-profile ---
    describe('PUT /users/update-employee-profile', () => {
        const path = '/users/update-employee-profile';
        const employeeData = {
            firstname: 'Jane',
            lastname: 'Doe',
            email: 'jane.doe@example.com',
            contact: '0987654321'
        };

        it('should update employee profile successfully (200 OK)', async () => {
            const response = await agent // Use agent
                .put(path)
                .send(employeeData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: '✅ Employee profile updated successfully!' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.updateEmployeeProfile).toHaveBeenCalledTimes(1);
            // Check if controller received user info and body
            expect(usersController.updateEmployeeProfile).toHaveBeenCalledWith(
                expect.objectContaining({ user: mockUser, body: employeeData }),
                expect.anything(), // Response object
                expect.any(Function) // Next function
            );
        });

        it('should require authentication (401 Unauthorized)', async () => {
            // Override authenticate mock to simulate failure
            mockedAuthenticate.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ error: 'Authentication required (mocked)' });
                // Do not call next()
            });

            const response = await agent // Use agent
                .put(path)
                .send(employeeData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.updateEmployeeProfile).not.toHaveBeenCalled();
        });
    });

    // --- Test PUT /users/update-petowner-profile ---
    describe('PUT /users/update-petowner-profile', () => {
        const path = '/users/update-petowner-profile';
        const ownerData = {
            firstname: 'John',
            lastname: 'Doe',
            email: 'john.doe@example.com',
            contact: '1234567890',
            address: '456 Elm St',
            altperson: 'Jane Doe',
            altcontact: '1122334455'
        };

        it('should update pet owner profile successfully (200 OK)', async () => {
            const response = await agent // Use agent
                .put(path)
                .send(ownerData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: '✅ Pet owner profile updated successfully!' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.updateOwnerProfile).toHaveBeenCalledTimes(1);
            // Check if controller received user info and body
            expect(usersController.updateOwnerProfile).toHaveBeenCalledWith(
                expect.objectContaining({ user: mockUser, body: ownerData }),
                expect.anything(),
                expect.any(Function)
            );
        });

        it('should require authentication (401 Unauthorized)', async () => {
            mockedAuthenticate.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ error: 'Authentication required (mocked)' });
            });

            const response = await agent // Use agent
                .put(path)
                .send(ownerData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.updateOwnerProfile).not.toHaveBeenCalled();
        });
    });

    // --- Test POST /users/change-password ---
    describe('POST /users/change-password', () => {
        const path = '/users/change-password';
        const passwordData = {
            currentPassword: 'oldpassword',
            newPassword: 'newpassword',
            confirmNewPassword: 'newpassword'
        };

        it('should change password successfully (200 OK)', async () => {
            const response = await agent // Use agent
                .post(path)
                .send(passwordData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: '✅ Password changed successfully!' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.changePassword).toHaveBeenCalledTimes(1);
            // Check if controller received user info and body
            expect(usersController.changePassword).toHaveBeenCalledWith(
                expect.objectContaining({ user: mockUser, body: passwordData }),
                expect.anything(),
                expect.any(Function)
            );
        });

        it('should require authentication (401 Unauthorized)', async () => {
            mockedAuthenticate.mockImplementationOnce((req, res, next) => {
                res.status(401).json({ error: 'Authentication required (mocked)' });
            });

            const response = await agent // Use agent
                .post(path)
                .send(passwordData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.changePassword).not.toHaveBeenCalled();
        });

        // Optional: Add test for password mismatch if validation is in controller
        // (Depends on how usersController.changePassword is implemented)
        // it('should return error if new passwords do not match (e.g., 400 Bad Request)', async () => {
        //     usersController.changePassword.mockImplementationOnce((req, res) => {
        //         res.status(400).json({ error: 'New passwords do not match' });
        //     });
        //
        //     const badPasswordData = { ...passwordData, confirmNewPassword: 'differentpassword' };
        //     const response = await agent
        //         .post(path)
        //         .send(badPasswordData);
        //
        //     expect(response.status).toBe(400);
        //     expect(response.body).toEqual({ error: 'New passwords do not match' });
        //     expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
        //     expect(usersController.changePassword).toHaveBeenCalledTimes(1);
        // });
    });
});