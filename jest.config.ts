import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    // ...
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/config/(.*)$": "<rootDir>/config/$1",
    "^@/graphql/(.*)$": "<rootDir>/graphql/$1",
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/locales/(.*)$": "<rootDir>/locales/$1",
    "^@/mocks/(.*)$": "<rootDir>/mocks/$1",
    "^@/providers/(.*)$": "<rootDir>/providers/$1",
    "^@/store/(.*)$": "<rootDir>/store/$1",
    "^@/stories/(.*)$": "<rootDir>/stories/$1",
    "^@/theme/(.*)$": "<rootDir>/theme/$1",
    "^@/routes$": "<rootDir>/routes",
    "^@/middleware$": "<rootDir>/middleware",
  },
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
