// tests/utils/emailUtility.test.js
const { sendEmail } = require('../../server/utils/emailUtility'); // Adjust path if needed

// --- Define mockSendMail first, so it's in scope for the mock factory ---
const mockSendMail = jest.fn();

// --- Mock nodemailer using the factory parameter ---
// This MUST be before the 'nodemailer' require/import if you use it later
jest.mock('nodemailer', () => ({
    // Define what the mocked module exports:
    // createTransport is a Jest mock function...
    createTransport: jest.fn().mockImplementation(() => {
        // ...that when called, returns an object...
        return {
            // ...containing our mock sendMail function.
            sendMail: mockSendMail
        };
    })
}));

// --- Now require nodemailer AFTER mocking it ---
// This variable will hold the mocked version defined above.
// We need it to reference 'nodemailer.createTransport' in our expectations.
const nodemailer = require('nodemailer');

// --- Test Data ---
const testTo = 'recipient@example.com';
const testSubject = 'Test Email Subject';
const testBody = 'This is the test email body.';
const testUser = 'test_user@gmail.com'; // Ensure these have values
const testPass = 'test_password';      // Ensure these have values

describe('sendEmail Function', () => {

    beforeEach(() => {
        // Reset all mocks (clears calls, reset implementation if not explicitly set again)
        jest.clearAllMocks();

        // --- Set up environment variables for the test context ---
        // This is still crucial!
        process.env.EMAIL_USER = testUser;
        process.env.EMAIL_PASS = testPass;
    });

    // Optional: Clean up env vars if needed
    // afterAll(() => {
    //   delete process.env.EMAIL_USER;
    //   delete process.env.EMAIL_PASS;
    // });

    test('should call createTransport with correct service and auth', async () => {
        // Arrange: Configure the mock sendMail's behavior for this test
        mockSendMail.mockResolvedValue({ response: '250 OK: Mock success' });

        // Act: Call the function under test
        await sendEmail(testTo, testSubject, testBody);

        // Assert:
        // 1. Verify the MOCKED createTransport was called
        expect(nodemailer.createTransport).toHaveBeenCalledTimes(1); // Check the mock
        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            service: 'gmail',
            auth: {
                user: testUser,
                pass: testPass,
            },
            // DO NOT include tls options here unless sendEmail explicitly adds them
        });

        // 2. Verify the MOCKED sendMail function was called
        expect(mockSendMail).toHaveBeenCalledTimes(1);
        // Optional: Add check for sendMail arguments if needed for this specific test
        // expect(mockSendMail).toHaveBeenCalledWith({ ... });
    });

    // --- Add your other tests back here ---
    // They should use the same mocking setup.
    // Example:
    test('should call sendMail with correct mail options', async () => {
         mockSendMail.mockResolvedValue({ response: '250 OK' });
         await sendEmail(testTo, testSubject, testBody);
         expect(mockSendMail).toHaveBeenCalledWith({
             from: `"Your Clinic" <${testUser}>`,
             to: testTo,
             subject: testSubject,
             text: testBody,
         });
     });

     test('should log error and not call transporter if EMAIL_USER is missing', async () => {
        delete process.env.EMAIL_USER;
        console.error = jest.fn();
        await sendEmail(testTo, testSubject, testBody);
        expect(console.error).toHaveBeenCalledWith("Error sending email: EMAIL_USER or EMAIL_PASS environment variables not set.");
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
        expect(mockSendMail).not.toHaveBeenCalled();
        console.error.mockRestore();
        process.env.EMAIL_USER = testUser; // Restore
    });

    // Add other tests similarly...

});