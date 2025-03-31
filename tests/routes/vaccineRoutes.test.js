// File: tests/routes/vaccineRoutes.test.js
const request = require('supertest');
const express = require('express');
const session = require('express-session'); // Include if auth depends on it

// --- Mock Dependencies ---
// Mock controller *before* requiring routes
jest.mock('../../server/controllers/vaccineController', () => ({
    addPetVaccinationRecord: jest.fn(),
    // Add mocks for other controller methods if vaccineRoutes uses them
}));

// Mock middleware *before* requiring routes
// Use the correct factory pattern for authorize based on the route definition
jest.mock('../../server/middleware/authMiddleware', () => ({
    authenticate: jest.fn(), // Implement per test or in beforeEach
    // Mock the factory function itself
    authorize: jest.fn((options) => {
        // The factory returns the actual middleware function
        return jest.fn((req, res, next) => {
            const allowedRoles = options.roles || [];
            if (req.user && allowedRoles.includes(req.user.role)) {
                next(); // Role allowed
            } else if (!req.user) {
                // Should be caught by authenticate first, but handle defensively
                res.status(403).json({ error: 'Forbidden: User not authenticated for authorization check (mocked)' });
            } else {
                // User exists but role not allowed for this route
                res.status(403).json({ error: 'Forbidden: Insufficient permissions (mocked)' });
            }
        });
    }),
}));

// --- Require modules AFTER mocks ---
const vaccineRoutes = require('../../server/routes/vaccineRoutes'); // Adjust path if needed
const vaccineController = require('../../server/controllers/vaccineController'); // Mocked version
const {
    authenticate: mockedAuthenticate,
    authorize: mockedAuthorizeFactory // Get the mock of the authorize *factory*
} = require('../../server/middleware/authMiddleware'); // Mocked versions

// --- Test Application Setup ---
const app = express();
app.use(express.json()); // Crucial for request body parsing

// Optional: Include session middleware if your authentication depends on it
app.use(session({
    secret: 'test-vaccine-secret-123',
    resave: false,
    saveUninitialized: false, // Usually false for login sessions
    cookie: { secure: false } // Set secure: true if testing HTTPS
}));

// Mount the vaccine routes under a base path (e.g., /api)
app.use('/api', vaccineRoutes);

// --- Test Suite ---
describe('Vaccine Routes - POST /api/pets/:pet_id/vaccines', () => {
    const petId = 'pet-789'; // Use the route parameter name 'pet_id' in tests
    const recordId = 'vacc-rec-xyz'; // Example ID for response checks
    const validVaccineData = {
        vax_type: 'Bordetella',
        imm_rec_quantity: 1,
        imm_rec_date: '2023-11-15' // Use a realistic date
        // Add other fields like 'administered_by' if needed by the controller
    };
    const allowedRoles = ['doctor', 'clinician']; // Roles defined in the route's authorize call
    let agent; // Use agent if session cookies are needed by auth

    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks between tests
        agent = request.agent(app); // Use agent to handle cookies/session

        // Default: Successful authentication (can be overridden)
        mockedAuthenticate.mockImplementation((req, res, next) => {
            // Determine role from header or default to an allowed one
            const role = req.headers['x-test-user-role'] || allowedRoles[0];
            req.user = { userId: 'user-456', role: role };
            req.session = req.session || {};
            req.session.userId = 'user-456'; // Simulate session auth if used
            next(); // Proceed
        });

        // Default: Successful controller action (can be overridden)
        vaccineController.addPetVaccinationRecord.mockImplementation((req, res) => {
            // Simulate successful creation with a 201 status
            res.status(201).json({
                message: '✅ Vaccination record added successfully!',
                recordId: recordId
             });
        });

        // Reset the factory mock's internal state if needed, although clearAllMocks should handle it.
        // We mostly care about the *returned* middleware function's behavior.
        // Clear calls to the inner mock function returned by the factory:
        // Note: This assumes the factory only gets called once during setup per route.
        // If the factory could be called multiple times, this gets more complex.
        if (mockedAuthorizeFactory && mockedAuthorizeFactory.mock.results[0]) {
             const innerAuthorizeMock = mockedAuthorizeFactory.mock.results[0].value;
             if(innerAuthorizeMock && typeof innerAuthorizeMock.mockClear === 'function') {
                innerAuthorizeMock.mockClear();
             }
        }
    });

    // Test success for each allowed role
    allowedRoles.forEach(role => {
        it(`should allow ${role} to add a valid vaccination record (201 Created)`, async () => {
            const path = `/api/pets/${petId}/vaccines`;

            const response = await agent.post(path)
                .set('x-test-user-role', role) // Set the role for this test
                .send(validVaccineData);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                message: '✅ Vaccination record added successfully!',
                recordId: recordId
            });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);

            // Check that the inner authorize middleware logic allowed the request through
            // And verify the controller was called
            expect(vaccineController.addPetVaccinationRecord).toHaveBeenCalledTimes(1);
            // Verify controller received correct data, including the URL parameter 'pet_id'
            expect(vaccineController.addPetVaccinationRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    params: { pet_id: petId }, // Match the route parameter name
                    body: validVaccineData,
                    user: expect.objectContaining({ role: role })
                }),
                expect.anything(), // res object
                expect.any(Function) // next function
            );
        });
    });


    it('should return 400 Bad Request if required fields are missing (controller validation)', async () => {
        const path = `/api/pets/${petId}/vaccines`;
        // Simulate controller rejecting due to missing data
        const expectedError = '❌ Vaccine type and administration date are required.';
        vaccineController.addPetVaccinationRecord.mockImplementationOnce((req, res) => {
            res.status(400).json({ error: expectedError });
        });

        const incompleteData = { ...validVaccineData, imm_rec_date: undefined }; // Missing date

        const response = await agent.post(path)
            .set('x-test-user-role', allowedRoles[0]) // Authenticated and authorized
            .send(incompleteData);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: expectedError });
        expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
        // Controller *was* called, but it returned the 400 error
        expect(vaccineController.addPetVaccinationRecord).toHaveBeenCalledTimes(1);
    });

    it('should forbid access for unauthorized role (e.g., petowner) (403 Forbidden)', async () => {
        const path = `/api/pets/${petId}/vaccines`;
        const unauthorizedRole = 'petowner';

        const response = await agent.post(path)
            .set('x-test-user-role', unauthorizedRole) // Set the unauthorized role
            .send(validVaccineData);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: 'Forbidden: Insufficient permissions (mocked)' });
         // Authenticate was called
        expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
         // Authorize middleware (inner function) intercepted and sent 403
         // Controller should NOT be called
        expect(vaccineController.addPetVaccinationRecord).not.toHaveBeenCalled();
    });

    it('should require authentication (401 Unauthorized)', async () => {
        const path = `/api/pets/${petId}/vaccines`;
        // Override authenticate mock to simulate failure for this specific test
         mockedAuthenticate.mockImplementationOnce((req, res, next) => {
             res.status(401).json({ error: 'Authentication required (mocked)' });
             // DO NOT call next()
         });

        const response = await agent.post(path)
            .send(validVaccineData); // Role header irrelevant as auth fails

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
         // Authenticate was called and failed
        expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
         // Authorize middleware and Controller should NOT be called
        expect(vaccineController.addPetVaccinationRecord).not.toHaveBeenCalled();
         // You generally don't need to check if the inner authorize mock was called here,
         // as the chain stops at authenticate.
    });

    // Optional: Test if authorize factory was called correctly during setup
    // This is less common to test directly within 'it' blocks due to `clearAllMocks`
    // but you could test it outside the main describe block or in a setup phase if needed.
    // it('checks if authorize factory was configured', () => {
    //    // Requires running route setup again or checking initial call
    //    expect(mockedAuthorizeFactory).toHaveBeenCalledWith({ roles: allowedRoles });
    // });
});