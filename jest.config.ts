import nextJest from "next/jest.js"
import type { Config } from "jest"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "<rootDir>/jest.environment.ts",
  watchman: false,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^~test/(.*)$": "<rootDir>/test/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/types/database.ts",
  ],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
}

export default createJestConfig(config)
