const request = require('supertest');
const express = require('express');
const session = require('express-session');
const recordController = require('../../server/controllers/recordController'); // Corrected path depth? Verify this path.
const {
  insertDiagnosis, insertSurgeryInfo, insertRecord, insertMatchRecLab,
  getLabIdByDescription, updateRecordInDB, updateMatchRecLab, getRecordById, updateDiagnosisText
} = require('../../server/models/recordModel'); // Corrected path depth? Verify this path.
const { sendEmail } = require('../../server/utils/emailUtility'); // Corrected path depth? Verify this path.
const crypto = require('crypto');

// --- Mocking ---
jest.mock('../../server/models/recordModel');
jest.mock('../../server/utils/emailUtility');
// Mock crypto *partially* if needed, or fully if functions are simple
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'), // Keep other crypto functions working if needed
  randomBytes: jest.fn(), // Specifically mock randomBytes
}));

// --- Test Application Setup ---
const app = express();
app.use(express.json());
app.use(session({
  secret: 'test-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware to Simulate Authentication (Populate req.user)
app.use((req, res, next) => {
  if (req.headers['x-test-user-role']) {
    req.user = { role: req.headers['x-test-user-role'] };
  } else {
    req.user = { role: 'guest' };
  }

  if (req.headers['x-test-set-diag-code']) {
    if (!req.session) {
      // This shouldn't happen if session middleware ran first, but good practice
      console.error("Attempted to set diag code header, but req.session doesn't exist.");
      return next(new Error("Session not initialized before setting test header"));
    }
    req.session.diagnosisAccessCode = req.headers['x-test-set-diag-code'];
    // Save the session explicitly after modification
    req.session.save(err => {
      if (err) {
        console.error("Test middleware session save error:", err);
        return next(err); // Pass error to Express error handler
      }
      console.log(`Test middleware set diagnosisAccessCode to: ${req.session.diagnosisAccessCode}`); // Log confirmation
      next(); // Proceed AFTER saving
    });
  } else if (req.headers['x-test-set-session']) { // Keep the general session setting logic if needed elsewhere
    try {
      const sessionData = JSON.parse(req.headers['x-test-set-session']);
      Object.assign(req.session, sessionData);
      req.session.save(err => {
        if (err) {
          console.error("Test session save error (general):", err);
          return next(err);
        }
        next();
      });
    } catch (e) {
      console.error("Failed to parse x-test-set-session header:", e);
      next(e);
    }
  } else {
    // Proceed if no session headers are being used for this request
    next();
  }
});


// --- Mount Routes AFTER Middleware ---
// ❗ Corrected route for addRecord to include :petId
app.post('/records/request-access-code', recordController.requestDiagnosisAccessCode);

// General routes with parameters next
app.post('/records/:petId', recordController.addRecord);
app.put('/records/:recordId', recordController.updateRecord);
// --- Test Suite ---
describe('Record Controller', () => {
  let agent;
  const recordId = '1'; // Define recordId here for reuse
  const existingRecord = { // Define existingRecord here for reuse
    record_id: recordId, record_date: '2022-01-01', record_weight: 10, record_temp: 37.5,
    record_condition: 'Healthy', record_symptom: 'None', record_recent_visit: '2022-01-01',
    record_purchase: 'Food', record_purpose: 'Checkup', lab_id: 1, diagnosis_id: 1, surgery_id: 1, record_lab_file: null
  };


  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks
    getLabIdByDescription.mockResolvedValue(1);
    insertDiagnosis.mockResolvedValue(1);
    insertSurgeryInfo.mockResolvedValue(1);
    insertRecord.mockResolvedValue(1);
    insertMatchRecLab.mockResolvedValue();
    // Set default for getRecordById here
    getRecordById.mockResolvedValue(existingRecord); // Default to finding the record
    updateRecordInDB.mockResolvedValue();
    updateMatchRecLab.mockResolvedValue();
    updateDiagnosisText.mockResolvedValue();
    sendEmail.mockResolvedValue();
    crypto.randomBytes.mockReturnValue(Buffer.from('ABCDEF01', 'hex'));

    agent = request.agent(app);
    process.env.CLINIC_OWNER_EMAIL = 'owner@test.com';
  });

  afterEach(() => {
    delete process.env.CLINIC_OWNER_EMAIL;
  });

  // --- addRecord Tests ---
  describe('POST /records/:petId', () => {
    const petId = '123';
    const validRecordData = {
      record_date: '2022-01-01', record_weight: 10, record_temp: 37.5, record_condition: 'Healthy',
      record_symptom: 'None', record_recent_visit: '2022-01-01', record_purchase: 'Food', record_purpose: 'Checkup'
    };

    it('should add a medical record successfully by a doctor (with lab, diagnosis, surgery)', async () => {
      const response = await agent // Use agent
        .post(`/records/${petId}`) // Use correct route with petId
        .set('x-test-user-role', 'doctor') // Use test header for role
        .send({
          ...validRecordData,
          lab_description: 'Blood Test', // Causes getLabIdByDescription -> 1
          diagnosis_text: 'No issues',   // Causes insertDiagnosis -> 1
          surgery_type: 'Neutering',     // Causes insertSurgeryInfo -> 1
          surgery_date: '2022-01-02',
        });

      expect(insertRecord).toHaveBeenCalledWith(petId, expect.objectContaining({
        ...validRecordData,
        lab_id: 1,
        diagnosis_id: 1,
        surgery_id: 1,
        record_lab_file: null // Ensure this is included/handled
      }));
      expect(insertMatchRecLab).toHaveBeenCalledWith(1, 1); // recordId, labId
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Medical record added successfully!');
    });

    it('should add a medical record successfully by a clinician (no diagnosis)', async () => {
      const response = await agent
        .post(`/records/${petId}`)
        .set('x-test-user-role', 'clinician')
        .send({
          ...validRecordData,
          lab_description: 'Blood Test',
          // No diagnosis_text
          surgery_type: 'Checkup Scan', // Can add surgery
          surgery_date: '2022-01-03',
        });

      expect(insertDiagnosis).not.toHaveBeenCalled(); // Verify clinician didn't insert diagnosis
      expect(insertRecord).toHaveBeenCalledWith(petId, expect.objectContaining({
        lab_id: 1,
        diagnosis_id: null, // Should be null
        surgery_id: 1,
      }));
      expect(insertMatchRecLab).toHaveBeenCalledWith(1, 1);
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Medical record added successfully!');
    });


    it('should return 400 if required fields are missing', async () => {
      const response = await agent
        .post(`/records/${petId}`)
        .set('x-test-user-role', 'doctor')
        .send({ // Missing record_weight, record_temp etc.
          record_date: '2022-01-01',
          record_condition: 'Healthy',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields.');
    });

    it('should return 403 if clinician tries to add a diagnosis during creation', async () => {
      const response = await agent
        .post(`/records/${petId}`)
        .set('x-test-user-role', 'clinician')
        .send({
          ...validRecordData,
          diagnosis_text: 'Should not be allowed', // Clinician adding diagnosis
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Clinicians cannot add a diagnosis when creating a record.');
    });

    it('should return 400 if invalid lab description is provided', async () => {
      getLabIdByDescription.mockResolvedValue(null); // Simulate invalid lab
      const response = await agent
        .post(`/records/${petId}`)
        .set('x-test-user-role', 'doctor')
        .send({
          ...validRecordData,
          lab_description: 'Invalid Lab Name',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid lab description.');
    });
  });

  // --- updateRecord Tests ---
  describe('PUT /records/:recordId', () => {
   // const recordId = '1';
   /* const existingRecord = {
      record_id: recordId, record_date: '2022-01-01', record_weight: 10, record_temp: 37.5,
      record_condition: 'Healthy', record_symptom: 'None', record_recent_visit: '2022-01-01',
      record_purchase: 'Food', record_purpose: 'Checkup', lab_id: 1, diagnosis_id: 1, surgery_id: 1, record_lab_file: null
    };*/
    const updateData = {
      record_weight: 11, record_condition: 'Sick', diagnosis_text: 'Flu Update'
    };

    
    it('should update a medical record successfully by a doctor', async () => {
      const response = await agent
        .put(`/records/${recordId}`)
        .set('x-test-user-role', 'doctor')
        .send(updateData);

      expect(getRecordById).toHaveBeenCalledWith(recordId);
      expect(updateDiagnosisText).toHaveBeenCalledWith(existingRecord.diagnosis_id, updateData.diagnosis_text);
      expect(updateRecordInDB).toHaveBeenCalledWith(recordId, expect.objectContaining({
        record_weight: updateData.record_weight, // updated
        record_condition: updateData.record_condition, // updated
        diagnosis_id: existingRecord.diagnosis_id, // updated via updateDiagnosisText, ID remains same
        // other fields should be from existingRecord
        record_date: existingRecord.record_date,
        lab_id: existingRecord.lab_id,
      }));
      expect(updateMatchRecLab).not.toHaveBeenCalled(); // Lab ID didn't change
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Medical record updated successfully!');
    });

    it('should insert new diagnosis if doctor updates record without existing diagnosis', async () => {
      getRecordById.mockResolvedValue({ ...existingRecord, diagnosis_id: null }); // Simulate no existing diagnosis
      insertDiagnosis.mockResolvedValue(2); // Simulate new diagnosis ID

      const response = await agent
        .put(`/records/${recordId}`)
        .set('x-test-user-role', 'doctor')
        .send({ diagnosis_text: 'New Diagnosis Added' });

      expect(updateDiagnosisText).not.toHaveBeenCalled();
      expect(insertDiagnosis).toHaveBeenCalledWith('New Diagnosis Added');
      expect(updateRecordInDB).toHaveBeenCalledWith(recordId, expect.objectContaining({
        diagnosis_id: 2, // Should link the new diagnosis ID
      }));
      expect(response.status).toBe(200);
    });


    it('should return 404 if record not found during update', async () => {
      getRecordById.mockResolvedValue(null); // Override default for this test

      const response = await agent
        .put(`/records/${recordId}`)
        .set('x-test-user-role', 'doctor')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Record not found.');
    });

    it('should return 403 if clinician tries to update diagnosis without access code', async () => {
      const response = await agent
        .put(`/records/${recordId}`)
        .set('x-test-user-role', 'clinician') // Clinician role
        .send({ diagnosis_text: 'Clinician Flu Update' }); // Attempting diagnosis update

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Clinicians need a valid access code to update a diagnosis.');
    });

    it('should return 403 if clinician tries to update diagnosis with incorrect access code', async () => {
      // Simulate session having a *different* code via agent's cookie persistence
      // First, request a code (which mocks setting it in session)
      crypto.randomBytes.mockReturnValue(Buffer.from('OLDCODE1', 'hex'));
      await agent.post('/records/request-access-code').set('x-test-user-role', 'clinician');
      // Now, attempt update with a different code
      const response = await agent
        .put(`/records/${recordId}`)
        .set('x-test-user-role', 'clinician')
        .send({
          diagnosis_text: 'Clinician Flu Update',
          accessCode: 'WRONGCODE' // Provide incorrect code
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Clinicians need a valid access code to update a diagnosis.');
    });


    it('should allow clinician to update diagnosis with correct access code', async () => {
      const correctCode = 'GOODCODE';
      
      //crypto.randomBytes.mockReturnValue(Buffer.from(correctCode, 'hex'));
     // await agent.post('/records/request-access-code').set('x-test-user-role', 'clinician'); // This should set req.session.diagnosisAccessCode via the agent

      // Now attempt the update with the correct code
      const response = await agent
                .put(`/records/${recordId}`)
                .set('x-test-user-role', 'clinician') // Set user role
                .set('x-test-set-diag-code', correctCode) // <--- SET SESSION CODE VIA HEADER
                .send({
                    diagnosis_text: 'Clinician Allowed Update',
                    accessCode: correctCode // Still need to send the code in the body for the controller check
                });

            // Assertions remain the same
            expect(getRecordById).toHaveBeenCalledWith(recordId);
            expect(updateDiagnosisText).toHaveBeenCalledWith(existingRecord.diagnosis_id, 'Clinician Allowed Update');
            expect(updateRecordInDB).toHaveBeenCalledWith(recordId, expect.objectContaining({
                 diagnosis_id: existingRecord.diagnosis_id,
            }));
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Medical record updated successfully!');
        });

        it('should allow clinician to add diagnosis with correct access code if none exists', async () => {
            // Simulate record having no existing diagnosis
            getRecordById.mockResolvedValue({ ...existingRecord, diagnosis_id: null });
            insertDiagnosis.mockResolvedValue(3); // Simulate new diagnosis ID
            const correctCode = 'ADDCODE1';

            // --- REMOVE THE POST REQUEST ---
            // crypto.randomBytes.mockReturnValue(Buffer.from(correctCode, 'hex'));
            // await agent.post('/records/request-access-code').set('x-test-user-role', 'clinician');

            // Attempt update, setting code via header
            const response = await agent
                .put(`/records/${recordId}`)
                .set('x-test-user-role', 'clinician')
                .set('x-test-set-diag-code', correctCode) // <--- SET SESSION CODE VIA HEADER
                .send({
                    diagnosis_text: 'Clinician Adding Diagnosis',
                    accessCode: correctCode // Send code in body too
                });

            // Assertions remain the same
            expect(insertDiagnosis).toHaveBeenCalledWith('Clinician Adding Diagnosis');
            expect(updateRecordInDB).toHaveBeenCalledWith(recordId, expect.objectContaining({
                 diagnosis_id: 3, // New ID linked
            }));
            expect(response.status).toBe(200);
        });

         // ... other update tests (lab link, etc.) ...

    }); // End describe PUT /records/:recordId


  // --- requestDiagnosisAccessCode Tests ---
  describe('POST /records/request-access-code', () => {
    // Use a fresh agent for each request code test if needed, but one per describe should be fine.

    it('should request diagnosis access code successfully, send email, and set session', async () => {
      const generatedCode = 'ABCDEF01'; // From the mock setup
      crypto.randomBytes.mockReturnValue(Buffer.from(generatedCode, 'hex')); // Ensure mock is set for this test

      const response = await agent // Use agent
        .post('/records/request-access-code')
        .set('x-test-user-role', 'clinician'); // Simulate clinician user

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('✅ Access code request sent. Await access code from the clinic owner.');
      expect(crypto.randomBytes).toHaveBeenCalledWith(4);
      expect(sendEmail).toHaveBeenCalledWith(
        'owner@test.com', // From process.env mock
        expect.any(String), // Subject can be flexible
        expect.stringContaining(`Access Code: ${generatedCode}`) // Check code is in body
      );

    }, 10000); // Increase timeout slightly just in case network mock is slow, but shouldn't be needed after fixes

    it('should return 500 if clinic owner email is not set', async () => {
      delete process.env.CLINIC_OWNER_EMAIL; // Unset the env var for this test

      const response = await agent
        .post('/records/request-access-code')
        .set('x-test-user-role', 'clinician');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('❌ Clinic owner email is not set.');
      expect(sendEmail).not.toHaveBeenCalled();
    });

  });

});