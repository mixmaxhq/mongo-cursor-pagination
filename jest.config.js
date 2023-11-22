module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^mongodbMapped$': `mongodb${process.env.DRIVER_VERSION || ''}`,
  },
  testTimeout: 15000,
};
