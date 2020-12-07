module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    "lib/**/{!(index),}.ts"
  ],
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "<rootDir>/node_modules"
  ],
  coverageReporters: [
    "html"
  ],
  resetMocks: true,
  roots: [
    "<rootDir>/lib",
    "<rootDir>/test"
  ],
  setupFiles: [
    "<rootDir>/test/setup/mockModules.js"
  ],
  testEnvironment: "jsdom",
  testMatch: [
    "**/?(*.)+(test).+(ts|js)"
  ],
  verbose: true
};
