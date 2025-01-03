module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  testRegex: '/((test|spec)s?|src)/.*([Tt]est|[Ss]pec)\\.(ts|js)$',
  testEnvironment: 'node',
  testTimeout: 15000,
};
