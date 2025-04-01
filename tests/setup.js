// tests/setup.js
// Setup file for Jest tests

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASSWORD = 'newpass';
process.env.DB_NAME = 'khoclinic';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.SESSION_SECRET = 'test-session-secret';

// Mock the database module
jest.mock('../server/config/db', () => require('../tests/__mocks__/db'));

// Global beforeEach to clear all mocks
beforeEach(() => {
  jest.clearAllMocks();
});