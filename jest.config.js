/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  clearMocks: true,
  testMatch: ["<rootDir>/test/*.ts"],
  collectCoverageFrom: ["src/**/*.js"],
  testEnvironment: "node",
  testTimeout: 20 * 1000, // 40 seconds
};
