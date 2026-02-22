module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'core/**/*.ts',
    'utils/**/*.ts',
    '!**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  testTimeout: 30000,
};
