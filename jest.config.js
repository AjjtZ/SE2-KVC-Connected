module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The root directory that Jest should scan for tests
  rootDir: './',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  
  // An array of regexp pattern strings that are matched against all test paths
  // Tests that match these patterns will be skipped
  testPathIgnorePatterns: [
    '/node_modules/',
    '/client/'
  ],
  
  // An array of regexp pattern strings that are matched against all source file paths
  // If the file path matches any of the patterns, coverage information will be skipped
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/client/'
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // Setup files that will be run before each test
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // A map from regular expressions to module names that allow to stub out resources
  moduleNameMapper: {
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/__mocks__/$1',
    '^../config/db$': '<rootDir>/tests/__mocks__/db.js'
  }
};