const base = require("../../jest.config.base.js");

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  rootDir: ".",
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // next is a peerDep not installed in this package — use a lightweight mock
    "^next/server$": "<rootDir>/src/__mocks__/next-server.ts",
  },
};
