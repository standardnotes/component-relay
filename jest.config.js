module.exports = {
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
  testEnvironment: "jsdom",
  testMatch: [
    "**/?(*.)+(test).+(ts|js)"
  ],
  verbose: true
};
