const base = require("../../jest.config.base.js");

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  rootDir: ".",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // @/ alias for src/
    "^@/(.+)\\.js$": "<rootDir>/src/$1",
    "^@/(.+)$": "<rootDir>/src/$1",
    // Workspace package aliases → TypeScript source
    "^@integriochat/db$": "<rootDir>/../../packages/db/src/index.ts",
    "^@integriochat/utils$": "<rootDir>/../../packages/utils/src/index.ts",
    "^@integriochat/ui$": "<rootDir>/../../packages/ui/src/index.ts",
    // next/server is available (next is a direct dep of apps/web)
    // but we still need to handle the internal next modules that may fail
    // in a node test environment — mock only what breaks
  },
};
