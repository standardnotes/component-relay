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
    "<rootDir>/test/setup/jsdom.js",
    "<rootDir>/test/setup/mockModules.js",
    "<rootDir>/test/setup/fakeHttpServer.js",
  ],
  testEnvironment: "jsdom",
  testMatch: [
    "**/?(*.)+(test).+(ts|js)"
  ],
  verbose: true
};
