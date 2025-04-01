const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// --- Mocking Dependencies ---

// Mock the Record Controller
jest.mock('../../server/controllers/recordController', () => ({
    addRecord: jest.fn(),
    updateRecord: jest.fn(),
    requestDiagnosisAccessCode: jest.fn(),
    getVisitRecords: jest.fn(),
}));

// Mock the Authentication Middleware
jest.mock('../../server/middleware/authMiddleware', () => ({
    authenticate: jest.fn((req, res, next) => {
        if (req.headers['x-test-authenticated'] === 'true') {
            req.user = {
                userId: 'mockUserId',
                role: req.headers['x-test-user-role'] || 'guest' // Get role from header
            };
            next();
        } else {
            res.status(401).json({ error: 'Authentication required (mocked)' });
        }
    }),
    // authorize is a factory returning the actual middleware
    authorize: jest.fn((options) => (req, res, next) => { // Capture the roles argument
        const allowedRoles = options.roles || []; // Use the roles passed in
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

// Mock authenticateToken from authUtility.js
jest.mock('../../server/utils/authUtility', () => ({
    authenticateToken: jest.fn((req, res, next) => {
        if (req.headers['x-test-authenticated'] === 'true') {
            req.user = {
                userId: 'mockUserId',
                role: req.headers['x-test-user-role'] || 'guest'
            };
            next();
        } else {
            res.status(401).json({ error: 'Authentication required (mocked)' });
        }
    }),
    generateToken: jest.fn(),
}));

// Mock multer
jest.mock('multer', () => {
    const multerMock = () => ({
        single: () => (req, res, next) => next()
    });
    multerMock.diskStorage = () => ({});
    return multerMock;
});

// Mock database
jest.mock('../../server/config/db', () => ({
    query: jest.fn().mockResolvedValue([[]]),
}));

// Mock generatePDF
jest.mock('../../server/utils/generatePDF', () => 
    jest.fn().mockResolvedValue('path/to/generated/pdf.pdf')
);

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    createReadStream: jest.fn().mockReturnValue({
        pipe: jest.fn()
    }),
}));

// --- NOW require the modules that use the mocks ---
const recordRoutes = require('../../server/routes/recordRoutes'); // Adjust path if needed
const recordController = require('../../server/controllers/recordController'); // Get mocked version
const { authenticate: mockedAuthenticate, authorize: mockedAuthorize } = require('../../server/middleware/authMiddleware'); // Get mocked version
const { authenticateToken: mockedAuthenticateToken } = require('../../server/utils/authUtility'); // Get mocked version
const db = require('../../server/config/db'); // Get mocked version
const generatePdf = require('../../server/utils/generatePDF'); // Get mocked version

// --- Test Application Setup ---
const app = express();
app.use(express.json()); // Crucial for POST/PUT bodies
app.use('/', recordRoutes);

// --- Test Suite ---
describe('Record Routes', () => {
    const petId = 'pet123';
    const recordId = 'rec456';
    let agent;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Provide default success implementations for mocked controller methods
        recordController.getVisitRecords.mockImplementation((req, res) => res.status(200).json([{ id: 1, pet_id: petId, date: '2023-01-01' }]));
        recordController.addRecord.mockImplementation((req, res) => res.status(201).json({ message: 'Record added (mocked)', id: recordId }));
        recordController.updateRecord.mockImplementation((req, res) => res.status(200).json({ message: 'Record updated (mocked)', id: req.params.recordId }));
        recordController.requestDiagnosisAccessCode.mockImplementation((req, res) => res.status(200).json({ message: 'Access code requested (mocked)', code: 'ABCDEF' }));
        
        // Mock db.query for search-records route
        db.query.mockResolvedValue([[{ date: '2023-01-01', purposeOfVisit: 'Checkup', pet_name: 'Fluffy' }]]);

        agent = request(app); // Use request(app) if no session needed, agent otherwise
    });

    // --- Test GET /visit-records ---
    describe('GET /visit-records', () => {
        const path = '/visit-records';

        it('should allow authenticated user to get visit records (200 OK)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(200);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.getVisitRecords).toHaveBeenCalledTimes(1);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.getVisitRecords).not.toHaveBeenCalled();
        });
    });

    // --- Test POST /records/:petId ---
    describe('POST /records/:petId', () => {
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

    // --- Test PUT /records/:recordId ---
    describe('PUT /records/:recordId', () => {
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

    // --- Test GET /records/request-access-code ---
    describe('GET /records/request-access-code', () => {
        const allowedRoles = ['clinician']; // Only clinician allowed
        const path = '/records/request-access-code';

        it(`should allow ${allowedRoles[0]} to request an access code (200 OK)`, async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', allowedRoles[0]);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Access code requested (mocked)');
            expect(response.body).toHaveProperty('code');
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.requestDiagnosisAccessCode).toHaveBeenCalledTimes(1);
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

    // --- Test GET /search-records ---
    describe('GET /search-records', () => {
        const path = '/search-records?pet_id=pet123';

        it('should allow authenticated user to search records (200 OK)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(200);
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledTimes(1);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(db.query).not.toHaveBeenCalled();
        });

        it('should return 400 if pet_id is missing', async () => {
            const response = await agent.get('/search-records')
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(400);
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
        });
    });

    // --- Test GET /generate-pdf/:petId/:recordId ---
    describe('GET /generate-pdf/:petId/:recordId', () => {
        const path = `/generate-pdf/${petId}/${recordId}`;

        it('should allow authenticated user to generate PDF (200 OK)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(200);
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(generatePdf).toHaveBeenCalledTimes(1);
            expect(generatePdf).toHaveBeenCalledWith(petId, recordId);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(generatePdf).not.toHaveBeenCalled();
        });
    });
});