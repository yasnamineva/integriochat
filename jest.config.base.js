/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Override to CommonJS so jest can require() modules
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          jsx: "react-jsx",
          // Clear TypeScript paths — jest moduleNameMapper handles aliases
          paths: {},
        },
        diagnostics: { warnOnly: true },
      },
    ],
  },
  moduleNameMapper: {
    // Strip .js extensions from relative imports (TS source uses .js for ESM compat)
    "^(\\.{1,2}/.+)\\.js$": "$1",
  },
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  clearMocks: true,
};
