const request = require('supertest');
const express = require('express');

// --- Mocking Dependencies ---

// Mock the Record Controller
jest.mock('../../server/controllers/recordController', () => ({
    addRecord: jest.fn(),
    updateRecord: jest.fn(),
    requestDiagnosisAccessCode: jest.fn(),
}));

// Mock the Authentication Middleware
// Using the same strategy as the previous example
jest.mock('../../server/middleware/authMiddleware', () => ({
    authenticate: jest.fn((req, res, next) => {
        if (req.headers['x-test-authenticated'] === 'true') {
            req.user = {
                id: 'mockUserId',
                role: req.headers['x-test-user-role'] || 'guest' // Get role from header
            };
            next();
        } else {
            res.status(401).json({ error: 'Authentication required (mocked)' });
        }
    }),
    // authorize is a factory returning the actual middleware
    // IMPORTANT: The mock needs to handle the different role arrays passed to it
    authorize: jest.fn((roles) => (req, res, next) => { // Capture the roles argument
        const allowedRoles = roles || []; // Use the roles passed in
        if (req.user && allowedRoles.includes(req.user.role)) {
            next(); // Role is allowed
        } else if (!req.user) {
            // Should ideally be caught by authenticate first, but handle defensively
            res.status(403).json({ error: 'Forbidden: User not authenticated for authorization check (mocked)' });
        } else {
            // User exists but role is not in the allowed list for this specific route
            res.status(403).json({ error: 'Forbidden: Insufficient permissions (mocked)' });
        }
    }),
}));

// --- NOW require the modules that use the mocks ---
const recordRoutes = require('../../server/routes/recordRoutes'); // Adjust path if needed
const recordController = require('../../server/controllers/recordController'); // Get mocked version
const { authenticate: mockedAuthenticate } = require('../../server/middleware/authMiddleware'); // Get mocked version

// --- Test Application Setup ---
const app = express();
app.use(express.json()); // Crucial for POST/PUT bodies
// Mount the routes under a base path (e.g., /api) for better organization
app.use('/api', recordRoutes);

// --- Test Suite ---
describe('Record Routes (/api/records)', () => {
    const petId = 'pet123';
    const recordId = 'rec456';
    let agent;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Provide default success implementations for mocked controller methods
        recordController.addRecord.mockImplementation((req, res) => res.status(201).json({ message: 'Record added (mocked)', id: recordId }));
        recordController.updateRecord.mockImplementation((req, res) => res.status(200).json({ message: 'Record updated (mocked)', id: req.params.recordId }));
        recordController.requestDiagnosisAccessCode.mockImplementation((req, res) => res.status(200).json({ message: 'Access code requested (mocked)', code: 'ABCDEF' }));

        agent = request(app); // Use request(app) if no session needed, agent otherwise
    });

    // --- Test POST /api/records/:petId ---
    describe('POST /api/records/:petId', () => {
        const allowedRoles = ['doctor', 'clinician'];
        const path = `/api/records/${petId}`;
        const requestBody = { diagnosis: 'Healthy', notes: 'Routine checkup' };

        allowedRoles.forEach(role => {
            it(`should allow ${role} to add a record (201 Created)`, async () => {
                const response = await agent.post(path)
                    .set('x-test-authenticated', 'true')
                    .set('x-test-user-role', role)
                    .send(requestBody);

                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('message', 'Record added (mocked)');
                expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                // authorize factory mock was called during setup, inner function executed here
                expect(recordController.addRecord).toHaveBeenCalledTimes(1);
                expect(recordController.addRecord).toHaveBeenCalledWith(
                    expect.objectContaining({ params: { petId }, body: requestBody }), // Check req structure
                    expect.anything(), // res
                    expect.any(Function) // next
                );
            });
        });

        it('should forbid access for unauthorized role (e.g., petowner) (403 Forbidden)', async () => {
            const response = await agent.post(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner') // Unauthorized role
                .send(requestBody);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: 'Forbidden: Insufficient permissions (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.addRecord).not.toHaveBeenCalled();
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.post(path)
                .set('x-test-authenticated', 'false') // Not authenticated
                .set('x-test-user-role', 'doctor') // Role doesn't matter here
                .send(requestBody);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.addRecord).not.toHaveBeenCalled();
        });
    });

    // --- Test PUT /api/records/:recordId ---
    describe('PUT /api/records/:recordId', () => {
        const allowedRoles = ['doctor', 'clinician'];
        const path = `/api/records/${recordId}`;
        const requestBody = { notes: 'Updated notes' };

        allowedRoles.forEach(role => {
            it(`should allow ${role} to update a record (200 OK)`, async () => {
                const response = await agent.put(path)
                    .set('x-test-authenticated', 'true')
                    .set('x-test-user-role', role)
                    .send(requestBody);

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('message', 'Record updated (mocked)');
                expect(response.body).toHaveProperty('id', recordId);
                expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                expect(recordController.updateRecord).toHaveBeenCalledTimes(1);
                expect(recordController.updateRecord).toHaveBeenCalledWith(
                    expect.objectContaining({ params: { recordId }, body: requestBody }), // Check req structure
                    expect.anything(), // res
                    expect.any(Function) // next
                );
            });
        });

        it('should forbid access for unauthorized role (e.g., petowner) (403 Forbidden)', async () => {
            const response = await agent.put(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner')
                .send(requestBody);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: 'Forbidden: Insufficient permissions (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.updateRecord).not.toHaveBeenCalled();
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.put(path)
                .set('x-test-authenticated', 'false')
                .send(requestBody);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.updateRecord).not.toHaveBeenCalled();
        });
    });

    // --- Test GET /api/records/request-access-code ---
    describe('GET /api/records/request-access-code', () => {
        const allowedRoles = ['clinician']; // Only clinician allowed
        const path = '/api/records/request-access-code';

        it(`should allow ${allowedRoles[0]} to request an access code (200 OK)`, async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', allowedRoles[0]);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Access code requested (mocked)');
            expect(response.body).toHaveProperty('code');
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.requestDiagnosisAccessCode).toHaveBeenCalledTimes(1);
            expect(recordController.requestDiagnosisAccessCode).toHaveBeenCalledWith(
                expect.anything(), // req
                expect.anything(), // res
                expect.any(Function) // next
            );
        });

        // Test roles that are authenticated but NOT allowed for this specific route
        ['doctor', 'petowner'].forEach(role => {
            it(`should forbid access for unauthorized role (${role}) (403 Forbidden)`, async () => {
                const response = await agent.get(path)
                    .set('x-test-authenticated', 'true')
                    .set('x-test-user-role', role); // Unauthorized role for this route

                expect(response.status).toBe(403);
                expect(response.body).toEqual({ error: 'Forbidden: Insufficient permissions (mocked)' });
                expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                expect(recordController.requestDiagnosisAccessCode).not.toHaveBeenCalled();
            });
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'false'); // Not authenticated

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.requestDiagnosisAccessCode).not.toHaveBeenCalled();
        });
    });
});